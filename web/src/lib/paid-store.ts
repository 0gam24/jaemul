import type { Reading } from "./reading";

/**
 * 결제 영수증·풀이 캐시 저장소 (KV: PAID 바인딩) — 서버 전용
 *
 * 왜 필요한가: 이전에는 결제 여부가 기기 localStorage에만 있어서 /api/reading을 직접
 * 호출하면 990원 풀이가 무료로 나왔고, LLM 비용은 그대로 발생했다. 절대규칙 7(금액 검증은
 * 서버에서)의 연장선 — 결제 '여부'의 진실도 서버가 들고 있어야 한다.
 *
 * 캐시를 같은 저장소에 두는 이유: 주문번호 1개 = 풀이 1개 = LLM 호출 1회.
 * 결제자가 /p를 새로고침해도 구운 풀이를 그대로 꺼내 주므로 비용이 두 번 나가지 않는다.
 *
 * 프라이버시: 저장하는 건 주문번호와 풀이 본문뿐 — 생년월일·이름 0%.
 * (주문번호는 pay.ts newOrderId()가 난수로만 만들어 그 자체에 개인정보가 없다)
 */

type KvNamespace = {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
};

/** 보관 기간 180일 — /p 안내문의 "언제든 다시 볼 수 있어요" 약속에 맞춘 값 */
const TTL_SECONDS = 180 * 24 * 60 * 60;

/** KV 바인딩. 로컬 dev 등 바인딩이 없으면 null (호출부가 dev 우회를 판단한다) */
export async function getPaidStore(): Promise<KvNamespace | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext() as { env?: { PAID?: KvNamespace } };
    return env?.PAID ?? null;
  } catch {
    return null;
  }
}

/** 토스 주문번호 규격(6~64자, 영문/숫자/-/_) — KV 키로 쓰기 전 형식 검사 */
export function isValidOrderId(v: unknown): v is string {
  return typeof v === "string" && /^[\w-]{6,64}$/.test(v);
}

export async function markPaid(kv: KvNamespace, orderId: string): Promise<void> {
  await kv.put(`paid:${orderId}`, new Date().toISOString(), { expirationTtl: TTL_SECONDS });
}

export async function isPaid(kv: KvNamespace, orderId: string): Promise<boolean> {
  return (await kv.get(`paid:${orderId}`)) !== null;
}

export type CachedReading = {
  reading: Reading;
  vessel: string;
  mode: string;
  /** 오행 밸런스 도식용 카운트 (목·화·토·금·수) — 구버전 캐시에는 없음 */
  elements?: Record<string, number>;
};

export async function getCachedReading(kv: KvNamespace, orderId: string): Promise<CachedReading | null> {
  try {
    const raw = await kv.get(`reading:${orderId}`);
    return raw ? (JSON.parse(raw) as CachedReading) : null;
  } catch {
    // 캐시가 깨져 있어도 결제자를 막지 않는다 — 다시 구우면 된다
    return null;
  }
}

export async function putCachedReading(kv: KvNamespace, orderId: string, v: CachedReading): Promise<void> {
  try {
    await kv.put(`reading:${orderId}`, JSON.stringify(v), { expirationTtl: TTL_SECONDS });
  } catch {
    /* 캐시 저장 실패는 응답을 막지 않는다 */
  }
}
