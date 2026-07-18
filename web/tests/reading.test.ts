import { describe, it, expect } from "vitest";
import { buildMonthPlan, mockReading, validateReading, scanBanned } from "../src/lib/reading";
import { getSaju } from "../src/lib/manseryeok";
import { classifyVessel } from "../src/lib/vessel-types";

const INPUT = { year: 1991, month: 7, day: 23, hour: 10, minute: 30, gender: "여" as const };

describe("풀이 v2 — 엔진 캘린더 플랜 (검증단 P0)", () => {
  const from = new Date(2026, 6, 17); // 2026-07-17 결제 가정

  it("롤링 12개월: 결제월부터 시작, 지난 달 없음", () => {
    const plan = buildMonthPlan(INPUT, from);
    expect(plan.cells).toHaveLength(12);
    expect(plan.cells[0]).toMatchObject({ year: 2026, month: 7 });
    expect(plan.cells[11]).toMatchObject({ year: 2027, month: 6 });
  });

  it("월 밀림 회귀 방지: 각 칸 간지 = ssaju가 그 달 중순에 직접 계산한 월건", () => {
    // 검수단 P0: wolun.month는 사주 월 번호(인월=1)라 달력 월로 찾으면 한 달 밀린다.
    // 칸마다 해당 달 15일 기준 ssaju reference.codes.thisMonth와 교차 대조.
    const plan = buildMonthPlan(INPUT, from);
    for (const c of plan.cells) {
      const ref = getSaju(INPUT, { refDate: new Date(c.year, c.month - 1, 15) }).saju;
      expect(`${c.year}-${c.month} ${c.ganzhi}`).toBe(`${c.year}-${c.month} ${ref.reference.codes.thisMonth}`);
    }
  });

  it("모든 칸에 엔진 계산 근거(간지·십성)와 쉬운 라벨 존재", () => {
    const plan = buildMonthPlan(INPUT, from);
    for (const c of plan.cells) {
      expect(c.ganzhi.length).toBeGreaterThan(0);
      expect(c.tengod).toContain("/");
      expect(c.label.length).toBeGreaterThan(1);
      expect([1, 2, 3]).toContain(c.level);
    }
  });

  it("level 분포: 움직이는 달 2~3개, 잠그는 달 2~4개", () => {
    const plan = buildMonthPlan(INPUT, from);
    const l3 = plan.cells.filter((c) => c.level === 3).length;
    const l1 = plan.cells.filter((c) => c.level === 1).length;
    expect(l3).toBeGreaterThanOrEqual(2);
    expect(l3).toBeLessThanOrEqual(3);
    expect(l1).toBeGreaterThanOrEqual(2);
    expect(l1).toBeLessThanOrEqual(4);
  });

  it("결정성: 같은 입력·시점 → 같은 플랜", () => {
    const a = buildMonthPlan(INPUT, from);
    const b = buildMonthPlan(INPUT, from);
    expect(a).toEqual(b);
  });

  it("대운 교체 문구가 고정 생성됨 — 여러 사주에서 '정보 없음' 금지", () => {
    const inputs = [
      INPUT,
      { year: 1988, month: 6, day: 15, hour: 17, minute: 0, gender: "남" as const },
      { year: 1955, month: 8, day: 1, hour: 12, minute: 0, gender: "여" as const },
      { year: 2005, month: 1, day: 3, hour: 3, minute: 0, gender: "남" as const },
    ];
    for (const input of inputs) {
      const plan = buildMonthPlan(input, from);
      expect(plan.daeunLine).toContain("대운");
      expect(plan.daeunLine).not.toContain("없음");
    }
  });

  it("목 풀이가 검증 통과 (금지어·무결성)", () => {
    const { saju } = getSaju(INPUT);
    const vessel = classifyVessel(saju);
    const plan = buildMonthPlan(INPUT, from);
    const reading = mockReading(saju, vessel, plan);
    expect(validateReading(reading)).toBeNull();
  });

  it("오류 문자열 유출 차단 필터 작동", () => {
    expect(scanBanned("이 달은 undefined 기운이…")).not.toBeNull();
    expect(scanBanned("파이프라인 점검이 필요")).not.toBeNull();
    expect(scanBanned("무조건 부자 됩니다")).not.toBeNull();
    expect(scanBanned("8월에 수입 조건을 점검해 보세요")).toBeNull();
  });

  it("투자 지시 필터 — 프롬프트 금지 목록과 커버리지 일치 (검수단 P1)", () => {
    expect(scanBanned("이 달엔 부동산을 매수해 보세요")).not.toBeNull();
    expect(scanBanned("ETF나 펀드 같은 투자상품을 알아보세요")).not.toBeNull();
    expect(scanBanned("대출을 활용해 보세요")).not.toBeNull();
    expect(scanBanned("주식을 사보세요")).not.toBeNull();
    expect(scanBanned("이번 달은 저축 습관을 다지기 좋아요")).toBeNull();
  });

  it("LLM 페이로드에 생년월일·출생시각 원문 미포함 (프라이버시)", async () => {
    const { buildUserPayload } = await import("../src/lib/reading");
    const { saju } = getSaju(INPUT);
    const vessel = classifyVessel(saju);
    const plan = buildMonthPlan(INPUT, from);
    const payload = buildUserPayload(saju, vessel, plan);
    expect(payload).not.toMatch(/1991\.\s?7\.\s?23/);
    expect(payload).not.toMatch(/10:30/);
  });
});
