import { NextResponse } from "next/server";
import { PRICE_KRW } from "@/lib/pay";

/**
 * 결제 승인 (M3) — 절대규칙 7: 금액 검증은 반드시 서버에서.
 * 클라이언트가 보낸 amount는 참고용일 뿐, 서버 상수 PRICE_KRW와 다르면 무조건 거절하고
 * 토스 승인 요청에도 항상 서버 상수를 보낸다 (조작된 금액으로는 승인 자체가 불가능).
 *
 * 시크릿 키: 지금은 토스 문서용 공개 테스트 키 — 심사 후 TOSS_SECRET_KEY 환경변수로 교체.
 * TODO(M4 배포): 승인 성공 시 D1에 결제 기록(orderId·amount·approvedAt만 — 생년월일 0%) 저장.
 */

const SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

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
      Authorization: `Basic ${Buffer.from(`${SECRET_KEY}:`).toString("base64")}`,
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

  return NextResponse.json({ ok: true, orderId });
}
