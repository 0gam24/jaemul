import { describe, it, expect } from "vitest";
import { bindPaidOrder, bindToken, getPaidRecord, isValidOrderId, markPaid } from "../src/lib/paid-store";
import type { ManseInput } from "../src/lib/manseryeok";

/**
 * 주문번호 1건 = 사주 1개.
 *
 * 영수증은 기기에 남으므로 한 PC를 여러 사람이 쓰면 앞사람 영수증으로 뒷사람이 들어올 수
 * 있다. 그때 남의 풀이가 열리거나 앞사람 자리가 덮이지 않도록, 첫 열람에서 주문번호를
 * 그 사주에 묶는다. 여기서 검증하는 건 그 결속의 규칙이다.
 */

/** KV 대역 — 실제 Cloudflare KV 없이 저장 동작만 흉내 낸다 */
function fakeKv() {
  const map = new Map<string, string>();
  return {
    store: map,
    get: async (k: string) => map.get(k) ?? null,
    put: async (k: string, v: string) => void map.set(k, v),
  };
}

const A: Omit<ManseInput, "applyLMT"> = { year: 1988, month: 5, day: 12, hour: 9, minute: 30, gender: "남" };
const B: Omit<ManseInput, "applyLMT"> = { year: 1995, month: 11, day: 3, hour: 14, minute: 0, gender: "여" };

describe("결제 영수증 — 주문번호와 사주의 결속", () => {
  it("결제 직후에는 사주가 묶여 있지 않다 (결제 시점엔 어떤 사주를 볼지 모른다)", async () => {
    const kv = fakeKv();
    await markPaid(kv, "jaemul_aaaaaaaaaaaaaaaaaaaa");
    const rec = await getPaidRecord(kv, "jaemul_aaaaaaaaaaaaaaaaaaaa");
    expect(rec?.at).toBeTruthy();
    expect(rec?.bind).toBeUndefined();
  });

  it("첫 열람에서 사주가 묶이고, 그 뒤 다른 사주로는 덮이지 않는다", async () => {
    const kv = fakeKv();
    const order = "jaemul_bbbbbbbbbbbbbbbbbbbb";
    await markPaid(kv, order);

    const bindA = await bindToken(order, A);
    await bindPaidOrder(kv, order, bindA);
    expect((await getPaidRecord(kv, order))?.bind).toBe(bindA);

    // 뒷사람이 같은 기기에서 자기 사주로 들어와도 결속은 앞사람 것으로 유지된다
    const bindB = await bindToken(order, B);
    await bindPaidOrder(kv, order, bindB);
    expect((await getPaidRecord(kv, order))?.bind).toBe(bindA);
  });

  it("구버전 영수증(ISO 문자열 한 줄)도 그대로 읽힌다", async () => {
    const kv = fakeKv();
    kv.store.set("paid:jaemul_cccccccccccccccccccc", "2026-07-01T00:00:00.000Z");
    const rec = await getPaidRecord(kv, "jaemul_cccccccccccccccccccc");
    expect(rec?.at).toBe("2026-07-01T00:00:00.000Z");
    expect(rec?.bind).toBeUndefined();
  });

  it("결제 기록이 없으면 null", async () => {
    expect(await getPaidRecord(fakeKv(), "jaemul_dddddddddddddddddddd")).toBeNull();
  });
});

describe("사주 지문 (bindToken)", () => {
  const order = "jaemul_eeeeeeeeeeeeeeeeeeee";

  it("같은 주문번호 + 같은 사주 → 항상 같은 값", async () => {
    expect(await bindToken(order, A)).toBe(await bindToken(order, { ...A }));
  });

  it("사주가 다르면 값이 다르다", async () => {
    expect(await bindToken(order, A)).not.toBe(await bindToken(order, B));
  });

  it("풀이를 바꾸는 값은 하나라도 달라지면 다른 지문이 된다", async () => {
    const base = await bindToken(order, A);
    const variants: Array<Omit<ManseInput, "applyLMT">> = [
      { ...A, year: 1989 },
      { ...A, month: 6 },
      { ...A, day: 13 },
      { ...A, hour: 10 },
      { ...A, minute: 31 },
      { ...A, gender: "여" },
      { ...A, calendar: "lunar" },
      { ...A, leap: true },
      { ...A, timeUnknown: true },
    ];
    for (const v of variants) expect(await bindToken(order, v)).not.toBe(base);
  });

  it("주문번호가 소금이라 같은 사람이 재결제해도 지문이 달라진다 (결제 간 추적 불가)", async () => {
    const first = await bindToken("jaemul_11111111111111111111", A);
    const second = await bindToken("jaemul_22222222222222222222", A);
    expect(first).not.toBe(second);
  });

  it("생년월일이 그대로 남지 않는다 — 32자리 16진수", async () => {
    const token = await bindToken(order, A);
    expect(token).toMatch(/^[0-9a-f]{32}$/);
    expect(token).not.toContain("1988");
  });
});

describe("주문번호 형식 검사", () => {
  it("토스페이 규격(최대 50자) 안쪽만 통과한다", () => {
    expect(isValidOrderId("jaemul_2cec834f8d8f43489e36")).toBe(true);
    expect(isValidOrderId("short")).toBe(false);
    expect(isValidOrderId("j".repeat(51))).toBe(false);
    expect(isValidOrderId("has space")).toBe(false);
    expect(isValidOrderId(undefined)).toBe(false);
  });
});
