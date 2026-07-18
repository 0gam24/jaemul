import { calculateSaju, type SajuResult } from "ssaju";

/**
 * 만세력 래퍼 — ssaju 위에 한국 시간대 역사 보정을 얹는다.
 *
 * ssaju가 처리하는 것: 절입(분 단위)·음양력 변환·진태양시(applyLocalMeanTime)·
 * 야자시 학파 방식(일주는 자정에 변경, 23시대는 당일 유지).
 * ssaju가 처리하지 않는 것(여기서 보정): 서머타임(1948~51, 1955~60, 1987~88)과
 * 구표준시 UTC+8:30 시대(1954-03-21~1961-08-09).
 *
 * 보정 원리: 출생기록의 시계 시각 → 당시 실제 UTC 오프셋으로 환산 →
 * UTC+9(현행 KST) 기준 등가 시각으로 변환해 ssaju에 입력.
 */

export type ManseInput = {
  year: number;
  month: number;
  day: number;
  hour?: number;
  minute?: number;
  gender: "남" | "여";
  calendar?: "solar" | "lunar";
  leap?: boolean;
  /** "시간 몰라요" — hour 미상. 시주 없이 3주만 사용 */
  timeUnknown?: boolean;
  /** 진태양시 보정 (서울 경도 -32분). 기본 true */
  applyLMT?: boolean;
};

export type ManseOutput = {
  saju: SajuResult;
  meta: {
    /** 시계 시각 → KST 등가 시각으로 더한 분 (서머타임 -60, 구표준시 +30 등) */
    correctionMinutes: number;
    /** 보정 후 ssaju에 실제 입력된 양력 시각 */
    kstEquivalent: { year: number; month: number; day: number; hour: number; minute: number };
    timeUnknown: boolean;
    appliedLMT: boolean;
  };
};

const SEOUL_LONGITUDE = 126.9784;

/** 한국 시계의 역사적 UTC 오프셋(분). 배열 순서대로 첫 매칭 우선 — DST 기간을 구표준시 기간보다 먼저 둔다. */
const OFFSET_PERIODS: { from: number; to: number; offset: number }[] = [
  // 서머타임 (표준시 +9 시대): 실제 +10
  { from: 194806010000, to: 194809130000, offset: 600 },
  { from: 194904030000, to: 194909110000, offset: 600 },
  { from: 195004010000, to: 195009100000, offset: 600 },
  { from: 195105060000, to: 195109090000, offset: 600 },
  // 서머타임 (구표준시 +8:30 시대): 실제 +9:30
  { from: 195505050000, to: 195509090000, offset: 570 },
  { from: 195605200000, to: 195609300000, offset: 570 },
  { from: 195705050000, to: 195709220000, offset: 570 },
  { from: 195805040000, to: 195809210000, offset: 570 },
  { from: 195905030000, to: 195909200000, offset: 570 },
  { from: 196005010000, to: 196009180000, offset: 570 },
  // 구표준시 UTC+8:30 (동경 127.5도 기준)
  { from: 195403210000, to: 196108100000, offset: 510 },
  // 서머타임 (현행 +9 시대, 올림픽 전후)
  { from: 198705100200, to: 198710110300, offset: 600 },
  { from: 198805080200, to: 198810090300, offset: 600 },
];

function clockKey(y: number, mo: number, d: number, h: number, mi: number): number {
  return ((y * 100 + mo) * 100 + d) * 10000 + h * 100 + mi;
}

/** 해당 시계 시각의 실제 UTC 오프셋(분) */
export function historicalUtcOffsetMinutes(y: number, mo: number, d: number, h: number, mi: number): number {
  const key = clockKey(y, mo, d, h, mi);
  for (const p of OFFSET_PERIODS) {
    if (key >= p.from && key < p.to) return p.offset;
  }
  return 540; // UTC+9
}

/** 시계 시각 → UTC+9 등가 시각 */
export function toKstEquivalent(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number
): { year: number; month: number; day: number; hour: number; minute: number; correctionMinutes: number } {
  const offset = historicalUtcOffsetMinutes(y, mo, d, h, mi);
  const correctionMinutes = 540 - offset; // 서머타임이면 -60, 구표준시면 +30
  const t = new Date(Date.UTC(y, mo - 1, d, h, mi + correctionMinutes));
  return {
    year: t.getUTCFullYear(),
    month: t.getUTCMonth() + 1,
    day: t.getUTCDate(),
    hour: t.getUTCHours(),
    minute: t.getUTCMinutes(),
    correctionMinutes,
  };
}

export function getSaju(input: ManseInput, opts?: { refDate?: Date }): ManseOutput {
  const {
    year, month, day,
    hour = 12, minute = 0,
    gender, leap = false,
    calendar = "solar",
    timeUnknown = false,
    applyLMT = true,
  } = input;

  // 음력 입력은 먼저 양력으로 변환 — 시간대 보정은 양력(시계) 날짜에 적용해야 한다
  let sy = year, sm = month, sd = day;
  if (calendar === "lunar") {
    const probe = calculateSaju({ year, month, day, hour: 12, minute: 0, gender, calendar: "lunar", leap });
    sy = probe.solar.year;
    sm = probe.solar.month;
    sd = probe.solar.day;
  }

  const k = toKstEquivalent(sy, sm, sd, hour, minute);

  const saju = calculateSaju({
    year: k.year,
    month: k.month,
    day: k.day,
    hour: timeUnknown ? 12 : k.hour,
    minute: timeUnknown ? 0 : k.minute,
    gender,
    calendar: "solar",
    longitude: SEOUL_LONGITUDE,
    applyLocalMeanTime: applyLMT,
    ...(opts?.refDate ? { now: opts.refDate } : {}),
  });

  return {
    saju,
    meta: {
      correctionMinutes: k.correctionMinutes,
      kstEquivalent: { year: k.year, month: k.month, day: k.day, hour: k.hour, minute: k.minute },
      timeUnknown,
      appliedLMT: applyLMT,
    },
  };
}
