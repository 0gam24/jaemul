import { NextResponse } from "next/server";
import { ORDER_NAME, newOrderId } from "@/lib/pay";
import { createTossPayPayment, hasTossPayKey } from "@/lib/tosspay-server";

/**
 * 결제 생성 (토스페이) — 구매자를 보낼 결제 페이지 주소를 받아온다.
 *
 * 토스페이먼츠 위젯과 달리 토스페이는 결제를 '서버가 먼저 만들고' 구매자를 그 페이지로
 * 보내는 방식이다. 그래서 주문번호도 금액도 전부 여기서 정한다 — 클라이언트는 아무 값도
 * 보내지 않고, 조작할 값도 없다 (절대규칙 7).
 *
 * 흐름:
 *   여기(결제 생성) → checkoutPage로 이동 → 토스 앱 인증 → /pay/success → 승인(confirm)
 */

export const dynamic = "force-dynamic";

/**
 * 되돌아올 주소의 기준점. 요청 헤더의 Host를 쓰지 않는 이유 — 위조된 Host로 결제 완료
 * 리다이렉트를 남의 도메인으로 돌릴 수 있다. 배포 도메인을 고정값으로 못 박는다.
 */
const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_URL ?? "https://jaemul.kr";

export async function POST() {
  if (!hasTossPayKey()) {
    // 키 미설정 배포에서 결제창이 열렸다가 조용히 실패하는 것보다, 여기서 분명히 멈춘다
    return NextResponse.json(
      { error: "pay_unavailable", message: "결제 준비 중이에요. 잠시 후 다시 시도해 주세요." },
      { status: 503 }
    );
  }

  const orderNo = newOrderId();
  const created = await createTossPayPayment({
    orderNo,
    productDesc: ORDER_NAME,
    // 주문번호를 쿼리로 들려 보낸다 — 돌아왔을 때 어떤 결제인지 서버가 알아야 승인할 수 있다
    retUrl: `${SITE_ORIGIN}/pay/success?orderNo=${encodeURIComponent(orderNo)}`,
    retCancelUrl: `${SITE_ORIGIN}/pay/fail`,
  });

  if (!created) {
    return NextResponse.json(
      { error: "create_failed", message: "결제를 시작하지 못했어요. 잠시 후 다시 시도해 주세요." },
      { status: 502 }
    );
  }

  // payToken은 돌려주지 않는다 — 승인은 서버가 주문번호로 다시 조회해서 처리한다
  return NextResponse.json({ orderNo, checkoutPage: created.checkoutPage });
}
