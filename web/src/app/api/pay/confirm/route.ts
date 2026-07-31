import { NextResponse } from "next/server";
import { PRICE_KRW } from "@/lib/pay";
import { executeTossPay, getTossPayStatus } from "@/lib/tosspay-server";
import { getPaidStore, isValidOrderId, markPaid } from "@/lib/paid-store";

/**
 * 결제 승인 (토스페이) — 절대규칙 7: 금액 검증은 반드시 서버에서.
 *
 * 구매자가 토스 앱에서 인증을 마치고 돌아오면 여기로 온다. 인증은 아직 결제가 아니다 —
 * 이 라우트가 승인(execute)을 호출해야 실제로 돈이 빠져나간다.
 *
 * 클라이언트가 보내는 건 주문번호 하나뿐이다. 금액도 payToken도 받지 않는다:
 *   ① 주문번호로 토스페이에 상태를 조회한다 (payToken·금액을 여기서 얻는다)
 *   ② 금액이 서버 상수 PRICE_KRW와 다르면 승인하지 않는다
 *   ③ 인증 완료(PAY_APPROVED) 건만 승인한다
 *   ④ 승인 성공 시 주문번호를 KV(PAID)에 기록 — /api/reading의 열람 자격이 되는 서버 영수증
 *
 * 기기 localStorage 영수증은 '내 주문번호를 기억하는 메모'일 뿐 자격 증명이 아니다.
 */

export const dynamic = "force-dynamic";

type Body = { orderNo?: string };

/** 이미 결제가 끝난 건 — 새로고침·뒤로가기로 두 번 들어와도 같은 답을 준다 */
function isAlreadyPaid(payStatus: string): boolean {
  return payStatus === "PAY_COMPLETE" || payStatus === "SETTLEMENT_COMPLETE";
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const orderNo = body.orderNo;
  if (!isValidOrderId(orderNo)) {
    return NextResponse.json({ error: "invalid_params" }, { status: 400 });
  }

  const status = await getTossPayStatus(orderNo);
  if (!status) {
    return NextResponse.json(
      { error: "status_unavailable", message: "결제 상태를 확인하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 502 }
    );
  }

  // 금액 위변조 차단 — 우리가 생성 때 못 박은 990원이 아니면 승인 시도조차 하지 않는다
  if (status.amount !== PRICE_KRW) {
    return NextResponse.json({ error: "amount_mismatch" }, { status: 400 });
  }

  if (!isAlreadyPaid(status.payStatus)) {
    if (status.payStatus !== "PAY_APPROVED") {
      // 대기·취소·환불 등 — 승인할 수 있는 상태가 아니다
      return NextResponse.json(
        { error: "confirm_failed", message: "결제가 완료되지 않았어요. 결제는 청구되지 않았어요." },
        { status: 400 }
      );
    }
    if (!(await executeTossPay(status.payToken, orderNo))) {
      return NextResponse.json(
        { error: "confirm_failed", message: "결제 승인에 실패했어요. 결제는 청구되지 않았어요." },
        { status: 502 }
      );
    }
  }

  // 서버 영수증 기록. 여기서 실패해도 결제는 이미 성사됐으므로 절대 실패로 응답하지 않는다 —
  // 열람 시 /api/reading이 토스페이에 직접 조회해 자격을 복구한다.
  const kv = await getPaidStore();
  if (kv) {
    try {
      await markPaid(kv, orderNo);
    } catch (e) {
      console.error("[pay] 영수증 기록 실패 — 열람은 토스페이 조회로 복구됨", orderNo, e);
    }
  }

  return NextResponse.json({ ok: true, orderNo });
}
