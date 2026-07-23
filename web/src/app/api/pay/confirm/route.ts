import { NextResponse } from "next/server";
import { PRICE_KRW } from "@/lib/pay";
import { tossAuthHeader } from "@/lib/toss-server";
import { getPaidStore, markPaid } from "@/lib/paid-store";

/**
 * 결제 승인 (M3) — 절대규칙 7: 금액 검증은 반드시 서버에서.
 * 클라이언트가 보낸 amount는 참고용일 뿐, 서버 상수 PRICE_KRW와 다르면 무조건 거절하고
 * 토스 승인 요청에도 항상 서버 상수를 보낸다 (조작된 금액으로는 승인 자체가 불가능).
 *
 * 승인 성공 시 주문번호를 KV(PAID)에 기록한다 — /api/reading의 열람 자격이 되는 서버 영수증.
 * 기기 localStorage 영수증은 이제 '내 주문번호를 기억하는 메모'일 뿐 자격 증명이 아니다.
 */

type Body = { paymentKey?: string; orderId?: string; amount?: number };

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const { paymentKey, orderId, amount } = body;
  if (typeof paymentKey !== "string" || !paymentKey || typeof orderId !== "string" || !/^[\w-]{6,64}$/.test(orderId)) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }
  // 금액 위변조 차단 — 서버 상수와 1원이라도 다르면 승인 시도조차 하지 않는다
  if (amount !== PRICE_KRW) {
    return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
  }

  const res = await fetch("https://api.tosspayments.com/v1/payments/confirm", {
    method: "POST",
    headers: {
      Authorization: tossAuthHeader(),
      "Content-Type": "application/json",
      "Idempotency-Key": orderId,
    },
    body: JSON.stringify({ paymentKey, orderId, amount: PRICE_KRW }),
  });

  const data = (await res.json()) as { status?: string; code?: string; message?: string };

  if (!res.ok || data.status !== "DONE") {
    return NextResponse.json(
      { error: "confirm_failed", code: data.code ?? "UNKNOWN", message: data.message ?? "결제 승인에 실패했어요" },
      { status: res.ok ? 502 : res.status }
    );
  }

  // 서버 영수증 기록. 여기서 실패해도 결제는 이미 성사됐으므로 절대 실패로 응답하지 않는다 —
  // 열람 시 /api/reading이 토스에 직접 조회해 자격을 복구한다.
  const kv = await getPaidStore();
  if (kv) {
    try {
      await markPaid(kv, orderId);
    } catch (e) {
      console.error("[pay] 영수증 기록 실패 — 열람은 토스 조회로 복구됨", orderId, e);
    }
  }

  return NextResponse.json({ ok: true, orderId });
}
