import { PRICE_KRW } from "./pay";

/**
 * 토스페이먼츠 서버 전용 헬퍼 — 시크릿 키를 다룬다.
 *
 * pay.ts와 나눠 둔 이유: pay.ts는 클라이언트 컴포넌트도 import하므로(가격·클라이언트 키),
 * 시크릿 키가 거기 있으면 브라우저 번들에 섞여 들어갈 위험이 있다. 이 파일은 라우트 핸들러
 * (서버)에서만 import한다.
 *
 * 지금은 토스 문서용 공개 테스트 키 — 심사 후 TOSS_SECRET_KEY 환경변수를 넣으면 자동 교체.
 */

const SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "test_gsk_docs_OaPz8L5KdmQXkzRz3y47BMw6";

export function tossAuthHeader(): string {
  return `Basic ${Buffer.from(`${SECRET_KEY}:`).toString("base64")}`;
}

/**
 * 주문번호로 결제 상태를 토스에 직접 조회.
 *
 * KV 영수증이 없을 때의 최종 확인 — 진실의 원천은 언제나 토스다. KV 쓰기가 실패했거나
 * 영수증이 만료된 결제자도 이 경로로 정상 열람된다(돈은 냈는데 못 보는 상황 방지).
 * 금액까지 대조해 990원 결제가 아닌 주문번호로는 열리지 않게 한다.
 */
export async function isOrderPaidAtToss(orderId: string): Promise<boolean> {
  try {
    const res = await fetch(
      `https://api.tosspayments.com/v1/payments/orders/${encodeURIComponent(orderId)}`,
      { headers: { Authorization: tossAuthHeader() } }
    );
    if (!res.ok) return false;
    const data = (await res.json()) as { status?: string; totalAmount?: number };
    return data.status === "DONE" && data.totalAmount === PRICE_KRW;
  } catch {
    // 조회 실패는 '미결제'로 본다 — 게이트는 fail-closed
    return false;
  }
}
