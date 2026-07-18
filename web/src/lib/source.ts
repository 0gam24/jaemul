/**
 * 유입 소스 계측 표준 (?from=) — 패널 채택 2 (2026-07-17)
 * 어느 루프(스레드/공유/대결/갤러리/일일운세)가 실행·결제를 만드는지 추적하는 차원.
 * M4 계측 이벤트(free_run/share_click/pay_done)에 이 값을 차원으로 전달한다.
 */

export const SOURCES = ["threads", "share", "vs", "types", "daily", "paidshare", "direct"] as const;
export type Source = (typeof SOURCES)[number];

const KEY = "jaemul.from";

/** 랜딩 시 1회 호출 — 첫 유입 소스를 세션에 고정 (이후 페이지 이동에도 유지) */
export function captureSource(): void {
  try {
    if (sessionStorage.getItem(KEY)) return; // 첫 터치 우선
    const f = new URLSearchParams(location.search).get("from");
    if (f && (SOURCES as readonly string[]).includes(f)) {
      sessionStorage.setItem(KEY, f);
    }
  } catch {
    /* ignore */
  }
}

export function getSource(): Source {
  try {
    return (sessionStorage.getItem(KEY) as Source) ?? "direct";
  } catch {
    return "direct";
  }
}

/** 내부 생성 링크에 from 파라미터 부착 */
export function withFrom(url: string, from: Source): string {
  return `${url}${url.includes("?") ? "&" : "?"}from=${from}`;
}
