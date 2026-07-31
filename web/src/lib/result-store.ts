import type { ManseInput } from "./manseryeok";
import { canonicalInput, clearReceipt } from "./pay";

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
    // 이 기기에서 다른 사주로 새 결과를 뽑았다면 앞사람 영수증을 버린다.
    // 진짜 차단은 서버가 한다(주문번호를 사주에 묶는다 — /api/reading). 여기서 미리 정리해
    // 두면 뒷사람이 402를 한 번 맞고 튕겨 나오는 대신 곧장 결제 화면을 보게 된다.
    const prev = loadResult();
    if (prev && canonicalInput(prev.input) !== canonicalInput(r.input)) clearReceipt();

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
