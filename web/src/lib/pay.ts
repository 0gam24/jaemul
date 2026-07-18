/**
 * 결제(M3) 공통 — 가격·키·영수증 저장
 *
 * 가격의 유일한 진실은 서버 상수 PRICE_KRW (절대규칙 7: 클라이언트 금액 신뢰 금지 —
 * confirm 엣지에서 이 값과 다르면 무조건 거절).
 *
 * 키: 지금은 토스 문서용 공개 테스트 키(회원가입 없이 누구나 쓰는 연습 키 — 실제 돈 안 나감).
 * 심사 통과 후 .env.local / 배포 환경변수에 실키를 넣으면 자동으로 교체된다.
 */

export const PRICE_KRW = 990;
export const ORDER_NAME = "재물그릇 상세 풀이";

/** 클라이언트 키 (공개되어도 되는 값) */
export const TOSS_CLIENT_KEY =
  process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY ?? "test_gck_docs_Ovk5rk1EwkEbP0W43n07xlzm";

/** 기기 저장 영수증 — 생년월일·사주 내용 없음 (orderId·시각만) */
export type PaidReceipt = { v: 1; orderId: string; paidAt: string };

const KEY = "jaemul.paid.v1";

export function saveReceipt(orderId: string): void {
  try {
    const r: PaidReceipt = { v: 1, orderId, paidAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(r));
  } catch {
    /* 스토리지 차단 — 결제 완료 화면에서 안내 */
  }
}

export function loadReceipt(): PaidReceipt | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const r = JSON.parse(raw) as PaidReceipt;
    if (r.v !== 1 || !r.orderId) return null;
    return r;
  } catch {
    return null;
  }
}

/** 주문번호 — 토스 규격(6~64자, 영문/숫자/-/_). 개인정보 0% */
export function newOrderId(): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  return `jaemul_${rand}`;
}
