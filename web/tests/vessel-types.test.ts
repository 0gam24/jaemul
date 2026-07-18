import { describe, it, expect } from "vitest";
import { getSaju } from "../src/lib/manseryeok";
import { VESSEL_TYPES, classifyVessel, type VesselCode } from "../src/lib/vessel-types";

describe("16유형 매핑 (SPEC §2)", () => {
  it("16유형 데이터 무결성: 칭호·팩폭·강점2·주의·궁합 전부 채워짐", () => {
    const codes = Object.keys(VESSEL_TYPES) as VesselCode[];
    expect(codes).toHaveLength(16);
    for (const code of codes) {
      const v = VESSEL_TYPES[code];
      expect(v.code).toBe(code);
      expect(v.name.endsWith("형")).toBe(true);
      expect(v.fact.length).toBeGreaterThan(5);
      expect(v.strengths).toHaveLength(2);
      expect(v.caution.length).toBeGreaterThan(5);
      expect(v.per100).toBeGreaterThan(0);
      expect(v.per100).toBeLessThanOrEqual(20);
      expect(VESSEL_TYPES[v.matchGood]).toBeDefined();
      expect(VESSEL_TYPES[v.matchBad]).toBeDefined();
      expect(v.matchGood).not.toBe(code);
      expect(v.matchBad).not.toBe(code);
    }
  });

  it("금지 카피 스캔: 불행 단정·보장 표현 없음 (절대규칙 1)", () => {
    const banned = ["망한다", "망합니다", "가난", "거지", "파산", "부자 된다", "부자가 됩니다", "보장"];
    const all = Object.values(VESSEL_TYPES)
      .flatMap((v) => [v.name, v.tagline, v.fact, v.caution, ...v.strengths])
      .join(" ");
    for (const word of banned) {
      expect(all.includes(word), `금지어 발견: ${word}`).toBe(false);
    }
  });

  it("결정성: 같은 사주 → 항상 같은 유형", () => {
    const input = { year: 1991, month: 7, day: 23, hour: 10, minute: 30, gender: "여" as const };
    const a = classifyVessel(getSaju(input).saju);
    const b = classifyVessel(getSaju(input).saju);
    expect(a.code).toBe(b.code);
  });

  it("커버리지: 1980~2005 날짜 그리드에서 유형 다양성 확보 + 전 케이스 유효 유형 반환", () => {
    const seen = new Set<VesselCode>();
    for (let year = 1980; year <= 2005; year++) {
      for (const [month, day, hour] of [[1, 5, 2], [3, 21, 8], [6, 10, 14], [9, 28, 20], [12, 15, 23]] as const) {
        for (const gender of ["남", "여"] as const) {
          const v = classifyVessel(getSaju({ year, month, day, hour, minute: 0, gender }).saju);
          expect(v, `${year}-${month}-${day} ${hour}시 매핑 실패`).toBeDefined();
          seen.add(v.code);
        }
      }
    }
    // 260개 샘플에서 최소 10개 유형 이상 등장해야 분포가 살아있는 것
    expect(seen.size).toBeGreaterThanOrEqual(10);
  });
});
