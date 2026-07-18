import { getSource } from "./source";

/**
 * 계측 (M4) — free_run / share_click / paid_view / daily_view
 * 유입 소스(?from=)를 차원으로 실어 어느 바이럴 루프가 실행·결제를 만드는지 추적한다.
 * 개인정보 0: 생년월일·사주 내용은 절대 싣지 않는다 — 이벤트명·소스·유형 slug만.
 */

export type TrackEvent = "free_run" | "share_click" | "paid_view" | "daily_view";

/** 허용 키만 컴파일 타임에 통과 — 생년월일·사주 내용이 실릴 틈을 타입으로 차단 */
type TrackProps = Partial<Record<"kind" | "slug" | "mode", string>>;

export function track(event: TrackEvent, props?: TrackProps): void {
  try {
    const payload = JSON.stringify({ e: event, from: getSource(), ts: Date.now(), ...props });
    if (navigator.sendBeacon?.("/api/e", new Blob([payload], { type: "application/json" }))) return;
    fetch("/api/e", { method: "POST", body: payload, keepalive: true }).catch(() => {});
  } catch {
    /* 계측 실패가 UX를 막지 않는다 */
  }
}
