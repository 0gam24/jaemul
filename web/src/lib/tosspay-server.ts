import { PRICE_KRW } from "./pay";

/**
 * 토스페이(간편결제) 서버 전용 헬퍼 — API Key를 다룬다.
 *
 * pay.ts와 나눠 둔 이유: pay.ts는 클라이언트 컴포넌트도 import하므로(가격·주문번호),
 * API Key가 거기 있으면 브라우저 번들에 섞여 들어갈 위험이 있다. 이 파일은 라우트 핸들러
 * (서버)에서만 import한다.
 *
 * 토스페이는 토스페이먼츠와 다른 서비스다 — 키 접두사도 반대다:
 *   토스페이     sk_test_… / sk_live_…   (요청 '본문'에 apiKey로 넣는다)
 *   토스페이먼츠  test_sk_… / live_sk_…   (Authorization 헤더 Basic 인증)
 * 여기 있는 건 전부 토스페이 쪽이다.
 *
 * 토스페이먼츠와 달리 공개 테스트 키가 없다. 키가 없으면 결제 생성은 실패하고,
 * 결제 조회는 '미결제'로 답한다(게이트는 언제나 fail-closed).
 */

const API_BASE = "https://pay.toss.im/api/v2";

/** 응답 대기 상한 — 토스가 늦게 답할 때 Workers 요청이 통째로 묶이지 않게 한다 */
const TIMEOUT_MS = 10_000;

function apiKey(): string {
  return process.env.TOSSPAY_API_KEY ?? "";
}

export function hasTossPayKey(): boolean {
  return apiKey().length > 0;
}

/** 토스페이 공통 응답 — code 0이 성공, 그 외는 전부 실패 */
type TossPayResponse = {
  code?: number;
  msg?: string;
  errorCode?: string;
  [k: string]: unknown;
};

async function callTossPay(path: string, params: Record<string, unknown>): Promise<TossPayResponse | null> {
  if (!hasTossPayKey()) return null;
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey: apiKey(), ...params }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) return null;
    return (await res.json()) as TossPayResponse;
  } catch {
    // 네트워크·타임아웃·JSON 깨짐 — 호출부가 전부 '실패'로 다룬다
    return null;
  }
}

/**
 * 결제 생성 — 구매자를 보낼 토스페이 결제 페이지(checkoutPage) 주소를 받아온다.
 *
 * 금액은 언제나 서버 상수 PRICE_KRW를 쓴다. 클라이언트는 금액을 보내지 않으므로
 * 조작된 금액으로는 결제 생성 자체가 불가능하다 (절대규칙 7).
 *
 * autoExecute를 켜지 않는 이유: 인증 직후 토스가 알아서 승인해 버리면 우리 서버가
 * 금액을 대조할 자리가 사라진다. 인증만 받고 승인은 confirm 라우트에서 직접 한다.
 */
export async function createTossPayPayment(args: {
  orderNo: string;
  productDesc: string;
  retUrl: string;
  retCancelUrl: string;
}): Promise<{ checkoutPage: string; payToken: string } | null> {
  const data = await callTossPay("/payments", {
    orderNo: args.orderNo,
    productDesc: args.productDesc,
    retUrl: args.retUrl,
    retCancelUrl: args.retCancelUrl,
    amount: PRICE_KRW,
    amountTaxFree: 0, // 디지털 콘텐츠 — 전액 과세
    autoExecute: false,
  });
  if (!data || data.code !== 0) return null;

  const checkoutPage = typeof data.checkoutPage === "string" ? data.checkoutPage : "";
  const payToken = typeof data.payToken === "string" ? data.payToken : "";
  if (!checkoutPage || !payToken) return null;
  return { checkoutPage, payToken };
}

export type TossPayStatus = {
  payToken: string;
  payStatus: string;
  /** 주문 금액 — 우리가 생성 때 못 박은 값이라 위조될 수 없다 */
  amount: number;
};

/**
 * 결제 상태 조회 — 주문번호만으로 payToken까지 되찾아온다.
 *
 * 결제 생성 시 받은 payToken을 따로 보관하지 않는 이유가 여기 있다. 주문번호로 언제든
 * 다시 물어볼 수 있으므로, 저장소가 비어 있거나 리다이렉트가 끊겨도 승인·열람을 복구할 수 있다.
 */
export async function getTossPayStatus(orderNo: string): Promise<TossPayStatus | null> {
  const data = await callTossPay("/status", { orderNo });
  if (!data || data.code !== 0) return null;

  const payToken = typeof data.payToken === "string" ? data.payToken : "";
  const payStatus = typeof data.payStatus === "string" ? data.payStatus : "";
  const amount = typeof data.amount === "number" ? data.amount : -1;
  if (!payToken || !payStatus) return null;
  return { payToken, payStatus, amount };
}

/**
 * 결제 승인 — 구매자 인증(PAY_APPROVED)까지 끝난 건을 실제 결제로 확정한다.
 * 여기를 통과해야 돈이 빠져나간다.
 */
export async function executeTossPay(payToken: string, orderNo: string): Promise<boolean> {
  const data = await callTossPay("/execute", { payToken, orderNo });
  if (!data || data.code !== 0) return false;
  // 승인 응답의 금액까지 대조 — 도중에 금액이 달라진 건은 결제 완료로 치지 않는다
  return typeof data.amount === "number" && data.amount === PRICE_KRW;
}

/** 결제가 끝난 상태인가 — 정산·환불 단계까지 '결제된 주문'으로 인정한다 */
function isSettledStatus(payStatus: string): boolean {
  return payStatus === "PAY_COMPLETE" || payStatus === "SETTLEMENT_COMPLETE";
}

/**
 * 주문번호로 결제 완료 여부를 토스페이에 직접 조회.
 *
 * KV 영수증이 없을 때의 최종 확인 — 진실의 원천은 언제나 토스다. KV 쓰기가 실패했거나
 * 영수증이 만료된 결제자도 이 경로로 정상 열람된다(돈은 냈는데 못 보는 상황 방지).
 * 금액까지 대조해 990원 결제가 아닌 주문번호로는 열리지 않게 한다.
 *
 * 환불된 주문(REFUND_*)은 여기서 걸러진다 — 환불받고도 계속 열어 보는 길을 막는다.
 */
export async function isOrderPaidAtTossPay(orderNo: string): Promise<boolean> {
  const s = await getTossPayStatus(orderNo);
  if (!s) return false; // 조회 실패는 '미결제'로 본다 — 게이트는 fail-closed
  return isSettledStatus(s.payStatus) && s.amount === PRICE_KRW;
}
