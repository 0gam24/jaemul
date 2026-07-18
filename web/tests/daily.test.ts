import { describe, it, expect } from "vitest";
import { dayGanzhiOf, tenGodOf, dailyFortune } from "../src/lib/daily";
import { getSaju } from "../src/lib/manseryeok";
import { scanBanned } from "../src/lib/reading";

const INPUT = { year: 1991, month: 7, day: 23, hour: 10, minute: 30, gender: "여" as const };

describe("오늘의 재물운 — 일진·십성·템플릿", () => {
  it("일진 앵커: 2000-01-01 = 戊午", () => {
    expect(dayGanzhiOf(new Date(2000, 0, 1)).ganzhi).toBe("戊午");
  });

  it("일진 연속성: 하루 뒤 = 육십갑자 다음 칸", () => {
    expect(dayGanzhiOf(new Date(2000, 0, 2)).ganzhi).toBe("己未");
    expect(dayGanzhiOf(new Date(1999, 11, 31)).ganzhi).toBe("丁巳");
  });

  it("십성 규칙 — 갑목 일간 기준 전체 표", () => {
    // 甲(양목) 기준: 같은 오행 비견/겁재, 내가 생 식신/상관, 내가 극 편재/정재,
    // 나를 극 편관/정관, 나를 생 편인/정인
    expect(tenGodOf("甲", "甲")).toBe("비견");
    expect(tenGodOf("甲", "乙")).toBe("겁재");
    expect(tenGodOf("甲", "丙")).toBe("식신");
    expect(tenGodOf("甲", "丁")).toBe("상관");
    expect(tenGodOf("甲", "戊")).toBe("편재");
    expect(tenGodOf("甲", "己")).toBe("정재");
    expect(tenGodOf("甲", "庚")).toBe("편관");
    expect(tenGodOf("甲", "辛")).toBe("정관");
    expect(tenGodOf("甲", "壬")).toBe("편인");
    expect(tenGodOf("甲", "癸")).toBe("정인");
  });

  it("십성 교차 검증 — ssaju 월운의 십성과 독립 구현이 일치", () => {
    // ssaju가 계산한 월운 천간 십성 vs 우리 tenGodOf — 두 독립 구현의 교차 대조
    const { saju } = getSaju(INPUT);
    const myStem = saju.pillarDetails.day.stem;
    for (const w of saju.wolun) {
      expect(tenGodOf(myStem, w.stem)).toBe(w.stemTenGod);
    }
  });

  it("결정성: 같은 사주·같은 날짜 → 같은 결과", () => {
    const a = dailyFortune(INPUT, new Date(2026, 6, 18));
    const b = dailyFortune(INPUT, new Date(2026, 6, 18));
    expect(a).toEqual(b);
  });

  it("출력 무결성 — 30일 연속 금지어·빈 값 없음", () => {
    for (let i = 0; i < 30; i++) {
      const f = dailyFortune(INPUT, new Date(2026, 6, 18 + i));
      expect(f.ganzhi).toHaveLength(2);
      expect(f.label.length).toBeGreaterThan(1);
      expect(f.message.length).toBeGreaterThan(10);
      expect(f.tip.length).toBeGreaterThan(5);
      expect([1, 2, 3]).toContain(f.level);
      expect(scanBanned(`${f.message} ${f.tip} ${f.levelName}`)).toBeNull();
    }
  });

  it("공망일은 절대 '돈길 열리는 날'(level 3)이 아님 — 배지·메시지 모순 방지 (검수단 P1)", () => {
    const inputs = [
      INPUT,
      { year: 1975, month: 4, day: 15, hour: 12, minute: 0, gender: "남" as const },
      { year: 1980, month: 1, day: 15, hour: 9, minute: 0, gender: "남" as const },
      { year: 1988, month: 6, day: 15, hour: 17, minute: 0, gender: "남" as const },
    ];
    for (const input of inputs) {
      for (let i = 0; i < 60; i++) {
        const f = dailyFortune(input, new Date(2026, 6, 18 + i));
        if (f.label === "헛도는 자리") {
          expect(f.level).toBeLessThanOrEqual(2);
        }
        // level 3이면 메시지가 경고 톤이 아니어야 함
        if (f.level === 3) {
          expect(f.message).not.toContain("헛도는");
          expect(f.message).not.toContain("미루");
        }
      }
    }
  });

  it("레벨 분포 — 60일 안에 세 레벨이 모두 등장", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 60; i++) {
      seen.add(dailyFortune(INPUT, new Date(2026, 6, 18 + i)).level);
    }
    expect(seen).toEqual(new Set([1, 2, 3]));
  });
});
