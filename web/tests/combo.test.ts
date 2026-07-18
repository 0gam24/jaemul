import { describe, it, expect } from "vitest";
import { normalizeMbti, comboFact, vsVerdict } from "../src/lib/combo";
import { VESSEL_TYPES, type VesselCode } from "../src/lib/vessel-types";

const codes = Object.keys(VESSEL_TYPES) as VesselCode[];
const ALL_MBTI = ["E", "I"].flatMap((a) =>
  ["N", "S"].flatMap((b) => ["T", "F"].flatMap((c) => ["J", "P"].map((d) => a + b + c + d)))
);

describe("성격 조합 카드 (패널 결론 C안)", () => {
  it("4글자 검증: 유효 16조합 통과, 이상값 거부", () => {
    for (const m of ALL_MBTI) expect(normalizeMbti(m)).toBe(m);
    expect(normalizeMbti("infp")).toBe("INFP"); // 소문자 허용
    for (const bad of ["ABCD", "EN", "EITJ", "XNFP", "INF1", ""]) {
      expect(normalizeMbti(bad)).toBeNull();
    }
  });

  it("256조합 전부 카피 생성 + 상표 문자열(MBTI) 미노출", () => {
    for (const code of codes) {
      for (const m of ALL_MBTI) {
        const { title, body } = comboFact(VESSEL_TYPES[code], m);
        expect(title).toContain(VESSEL_TYPES[code].name);
        expect(title).toContain(m);
        expect(body.length).toBeGreaterThan(30);
        expect(title + body).not.toContain("MBTI");
      }
    }
  });

  it("대결 판정: 전 256쌍 유효 + 금지 카피 없음 (절대규칙 1)", () => {
    const banned = ["망한다", "망합니다", "가난", "파산", "최악", "불행", "안 맞는다"];
    for (const a of codes) {
      for (const b of codes) {
        const v = vsVerdict(VESSEL_TYPES[a], VESSEL_TYPES[b]);
        expect(v.title.length).toBeGreaterThan(3);
        expect(v.detail.length).toBeGreaterThan(20);
        for (const w of banned) {
          expect(v.title + v.detail).not.toContain(w);
        }
      }
    }
  });

  it("판정 대칭성: (a,b)와 (b,a)는 같은 판정", () => {
    for (const a of codes) {
      for (const b of codes) {
        expect(vsVerdict(VESSEL_TYPES[a], VESSEL_TYPES[b]).title)
          .toBe(vsVerdict(VESSEL_TYPES[b], VESSEL_TYPES[a]).title);
      }
    }
  });
});
