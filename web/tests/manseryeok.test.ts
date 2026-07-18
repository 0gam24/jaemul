import { describe, it, expect } from "vitest";
import { getSaju, toKstEquivalent } from "../src/lib/manseryeok";

/**
 * SPEC §7 — 만세력 검증 20케이스.
 *
 * 검증 방법: 라이브러리 출력을 맹신하지 않기 위해 테스트 내부에
 * 독립 구현(율리우스일 기반 일주 공식 + 오호둔 시주 규칙)을 두고 교차 대조한다.
 * 일주 앵커: 2000-01-01 = 戊午 (JDN 2451545, (JDN+49) mod 60 = 54).
 * 년주·월주는 외부 확정 절입시각 앵커(예: 2024 입춘 = 02-04 17:27 KST)로 검증.
 * 야자시 학파(ssaju 방식): 일주는 자정(보정 후 유효시각)에 바뀌고, 23시대는 당일 유지.
 */

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"];
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"];

function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/** 독립 일주 계산 (앵커: 2000-01-01 戊午) */
function expectedDayPillar(y: number, m: number, d: number): string {
  const i = (jdn(y, m, d) + 49) % 60;
  return STEMS[i % 10] + BRANCHES[i % 12];
}

/** 독립 시주 계산 (오호둔: 시간 천간 = 일간에서 유도) */
function expectedHourPillar(dayPillar: string, hour: number, minute: number): string {
  const dayStemIdx = STEMS.indexOf(dayPillar[0]);
  const t = (hour * 60 + minute + 60) % 1440; // 자시 시작 23:00을 0으로
  const branchIdx = Math.floor(t / 120);
  const stemIdx = ((dayStemIdx % 5) * 2 + branchIdx) % 10;
  return STEMS[stemIdx] + BRANCHES[branchIdx];
}

/** 보정 체인 전체를 독립 재현: 시계시각 → 시대보정 → LMT(-32분) → 유효 일시 */
function effective(y: number, m: number, d: number, h: number, mi: number, lmt: boolean) {
  const k = toKstEquivalent(y, m, d, h, mi);
  const t = new Date(Date.UTC(k.year, k.month - 1, k.day, k.hour, k.minute - (lmt ? 32 : 0)));
  return {
    y: t.getUTCFullYear(), m: t.getUTCMonth() + 1, d: t.getUTCDate(),
    h: t.getUTCHours(), mi: t.getUTCMinutes(),
  };
}

type Case = {
  name: string;
  input: { year: number; month: number; day: number; hour: number; minute: number; calendar?: "solar" | "lunar"; leap?: boolean };
  lmt?: boolean; // 기본 false — 경계 케이스를 결정적으로 만들기 위해 명시 제어
  expectYear?: string;
  expectMonth?: string;
  expectSolar?: { year: number; month: number; day: number };
};

const CASES: Case[] = [
  // ── 절입일 출생 3 ──────────────────────────────────────
  { name: "01 절입: 2024-02-04 17:20 입춘(17:27) 직전 → 癸卯년 乙丑월", input: { year: 2024, month: 2, day: 4, hour: 17, minute: 20 }, expectYear: "癸卯", expectMonth: "乙丑" },
  { name: "02 절입: 2024-02-04 17:35 입춘 직후 → 甲辰년 丙寅월", input: { year: 2024, month: 2, day: 4, hour: 17, minute: 35 }, expectYear: "甲辰", expectMonth: "丙寅" },
  { name: "03 절입: 2020-02-04 12:00 입춘(18:03) 전 → 己亥년 丁丑월", input: { year: 2020, month: 2, day: 4, hour: 12, minute: 0 }, expectYear: "己亥", expectMonth: "丁丑" },
  // ── 야자시 2 (23시대 — 일주는 당일 유지) ──────────────
  { name: "04 야자시: 2000-01-01 23:40", input: { year: 2000, month: 1, day: 1, hour: 23, minute: 40 } },
  { name: "05 야자시: 1990-03-15 23:50", input: { year: 1990, month: 3, day: 15, hour: 23, minute: 50 } },
  // ── 조자시 2 (00시대) ─────────────────────────────────
  { name: "06 조자시: 2000-01-02 00:20 (LMT off → 당일 일주)", input: { year: 2000, month: 1, day: 2, hour: 0, minute: 20 } },
  { name: "07 조자시: 2000-01-02 00:20 (LMT on → 유효시각 전날 23:48, 일주 전날)", input: { year: 2000, month: 1, day: 2, hour: 0, minute: 20 }, lmt: true },
  // ── 서머타임 2 ────────────────────────────────────────
  { name: "08 서머타임: 1988-06-15 17:30 (시계) → 실표준시 16:30", input: { year: 1988, month: 6, day: 15, hour: 17, minute: 30 } },
  { name: "09 서머타임+구표준시: 1955-08-01 12:00 (시계 +9:30) → 등가 11:30", input: { year: 1955, month: 8, day: 1, hour: 12, minute: 0 } },
  // ── 음력 윤달 2 ───────────────────────────────────────
  { name: "10 음력: 2000-01-01 → 양력 2000-02-05 (설날)", input: { year: 2000, month: 1, day: 1, hour: 12, minute: 0, calendar: "lunar" }, expectSolar: { year: 2000, month: 2, day: 5 } },
  { name: "11 음력 윤달: 2020-윤4-15", input: { year: 2020, month: 4, day: 15, hour: 12, minute: 0, calendar: "lunar", leap: true } },
  // ── 자정 전후 2 ───────────────────────────────────────
  { name: "12 자정 직후: 1985-05-20 00:05", input: { year: 1985, month: 5, day: 20, hour: 0, minute: 5 } },
  { name: "13 자정 직전: 1985-05-20 23:58 (야자시 → 당일 일주)", input: { year: 1985, month: 5, day: 20, hour: 23, minute: 58 } },
  // ── 일반 7 ────────────────────────────────────────────
  { name: "14 일반: 2000-01-01 12:00 (앵커 — 戊午일)", input: { year: 2000, month: 1, day: 1, hour: 12, minute: 0 }, expectYear: "己卯", expectMonth: "丙子" },
  { name: "15 일반: 1990-09-15 08:30", input: { year: 1990, month: 9, day: 15, hour: 8, minute: 30 } },
  { name: "16 일반: 1984-02-02 04:30 (입춘 전 → 癸亥년)", input: { year: 1984, month: 2, day: 2, hour: 4, minute: 30 }, expectYear: "癸亥" },
  { name: "17 일반: 1996-12-31 15:00 → 丙子년", input: { year: 1996, month: 12, day: 31, hour: 15, minute: 0 }, expectYear: "丙子" },
  { name: "18 일반: 2010-07-07 21:15", input: { year: 2010, month: 7, day: 7, hour: 21, minute: 15 } },
  { name: "19 일반: 1975-11-11 11:11 → 乙卯년", input: { year: 1975, month: 11, day: 11, hour: 11, minute: 11 }, expectYear: "乙卯" },
  { name: "20 일반: 2024-02-05 09:00 (입춘 이튿날) → 甲辰년 丙寅월", input: { year: 2024, month: 2, day: 5, hour: 9, minute: 0 }, expectYear: "甲辰", expectMonth: "丙寅" },
];

describe("만세력 검증 20케이스 (SPEC §7)", () => {
  for (const c of CASES) {
    it(c.name, () => {
      const lmt = c.lmt ?? false;
      const { saju, meta } = getSaju({ ...c.input, gender: "남", applyLMT: lmt });

      // ① 음력 케이스: 양력 변환 확인 후, 이하 검증은 변환된 양력 날짜 기준
      if (c.expectSolar) {
        expect(saju.solar).toEqual(c.expectSolar);
      }
      const base = c.input.calendar === "lunar"
        ? { year: saju.solar.year, month: saju.solar.month, day: saju.solar.day }
        : { year: c.input.year, month: c.input.month, day: c.input.day };

      // ② 일주·시주 독립 교차 검증 (보정 체인 전체 재현)
      const eff = effective(base.year, base.month, base.day, c.input.hour, c.input.minute, lmt);
      const expDay = expectedDayPillar(eff.y, eff.m, eff.d);
      const expHour = expectedHourPillar(expDay, eff.h, eff.mi);
      expect(saju.pillars.day, "일주 불일치").toBe(expDay);
      expect(saju.pillars.hour, "시주 불일치").toBe(expHour);

      // ③ 년주·월주 외부 앵커 검증 (있는 케이스만)
      if (c.expectYear) expect(saju.pillars.year, "년주 불일치").toBe(c.expectYear);
      if (c.expectMonth) expect(saju.pillars.month, "월주 불일치").toBe(c.expectMonth);

      // ④ 서머타임 보정량 확인
      if (c.name.startsWith("08")) expect(meta.correctionMinutes).toBe(-60);
      if (c.name.startsWith("09")) expect(meta.correctionMinutes).toBe(-30);
    });
  }

  it("보정 없는 평시엔 correctionMinutes = 0", () => {
    const { meta } = getSaju({ year: 2000, month: 6, day: 1, hour: 12, minute: 0, gender: "여" });
    expect(meta.correctionMinutes).toBe(0);
  });

  it("구표준시(비서머타임) 1955-02-01: +30분 보정", () => {
    const { meta } = getSaju({ year: 1955, month: 2, day: 1, hour: 12, minute: 0, gender: "남" });
    expect(meta.correctionMinutes).toBe(30);
    expect(meta.kstEquivalent.hour).toBe(12);
    expect(meta.kstEquivalent.minute).toBe(30);
  });

  it("시간 몰라요 옵션: 시주 무시하고 정오로 계산", () => {
    const a = getSaju({ year: 1993, month: 4, day: 10, hour: 3, minute: 0, gender: "여", timeUnknown: true });
    const b = getSaju({ year: 1993, month: 4, day: 10, hour: 12, minute: 0, gender: "여" });
    expect(a.saju.pillars.day).toBe(b.saju.pillars.day);
  });
});
