/**
 * 결제(M3) 공통 — 가격·영수증 저장
 *
 * 가격의 유일한 진실은 서버 상수 PRICE_KRW (절대규칙 7: 클라이언트 금액 신뢰 금지).
 * 토스페이는 결제 생성부터 서버가 하므로 클라이언트는 금액을 아예 보내지 않는다 —
 * 조작된 금액으로는 결제가 만들어지지조차 않는다.
 *
 * 키는 여기 없다. 토스페이는 공개 클라이언트 키가 없고 API Key 하나뿐이라,
 * 서버 전용 파일(tosspay-server.ts)에만 둔다. 이 파일은 클라이언트도 import한다.
 */

import type { ManseInput } from "./manseryeok";

export const PRICE_KRW = 990;
export const ORDER_NAME = "재물그릇 상세 풀이";

/**
 * 사주 입력값을 한 줄로 펴는 정규형 — "같은 사주인가"를 판정하는 유일한 기준.
 *
 * 결제 1건은 사주 1개에 묶인다. 한 PC를 여러 사람이 쓰는 상황(가족·사무실)에서 앞사람
 * 영수증으로 뒷사람이 열거나, 반대로 뒷사람 때문에 앞사람 풀이가 덮이는 걸 막기 위한 것.
 * 서버는 이 문자열을 그대로 두지 않고 해시로만 보관한다 (paid-store.bindToken).
 *
 * 풀이 결과를 바꾸는 값은 전부 들어가야 한다 — 하나라도 빠지면 다른 사주가 같은 것으로 통과한다.
 */
export function canonicalInput(i: Omit<ManseInput, "applyLMT">): string {
  return [
    i.year,
    i.month,
    i.day,
    i.hour ?? "",
    i.minute ?? "",
    i.gender,
    i.calendar ?? "solar",
    i.leap ? 1 : 0,
    i.timeUnknown ? 1 : 0,
  ].join("|");
}

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

/** 서버가 402로 부인한 영수증 폐기 — 낡은 영수증으로 실패 화면에 갇히는 루프 방지 */
export function clearReceipt(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* 무시 */
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

/**
 * 주문번호 — 토스페이 규격(최대 50자, 영문·숫자·`_-:.^@`). 개인정보 0%.
 * 만드는 쪽은 서버(/api/pay/create)다 — 클라이언트가 정한 주문번호를 믿지 않는다.
 */
export function newOrderId(): string {
  const rand = crypto.randomUUID().replace(/-/g, "").slice(0, 20);
  return `jaemul_${rand}`;
}
