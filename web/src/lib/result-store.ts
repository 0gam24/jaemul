import type { ManseInput } from "./manseryeok";

/**
 * 코드 2종 분리 (SPEC §1 — 프라이버시 확정 사항)
 * - 공유 URL(/r/[slug])에는 유형 slug만 — 생년월일시 0%
 * - 본인 재열람용 전체 입력값은 이 모듈로 기기 localStorage에만 보관
 */

export type StoredResult = {
  v: 1;
  slug: string;
  input: Omit<ManseInput, "applyLMT">;
  savedAt: string;
};

const KEY = "jaemul.result.v1";

export function saveResult(r: Omit<StoredResult, "v" | "savedAt">): void {
  try {
    const item: StoredResult = { v: 1, ...r, savedAt: new Date().toISOString() };
    localStorage.setItem(KEY, JSON.stringify(item));
  } catch {
    /* 시크릿 모드 등 저장 불가 — 결과 표시엔 지장 없음 */
  }
}

export function loadResult(): StoredResult | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredResult;
    if (parsed.v !== 1 || !parsed.slug || !parsed.input) return null;
    return parsed;
  } catch {
    return null;
  }
}
