/**
 * Cloudflare Turnstile 클라이언트 헬퍼 (M4 봇 방어)
 * - 사이트키(NEXT_PUBLIC_TURNSTILE_SITE_KEY)가 빌드에 없으면 null 반환 → 서버도 시크릿 없으면
 *   검증을 건너뛰므로, 키 등록 전/후 배포 순서와 무관하게 무중단.
 * - 위젯은 Invisible 타입 전제 — 사용자에게 아무것도 보이지 않고 토큰만 발급된다.
 */

declare global {
  interface Window {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: {
          sitekey: string;
          callback: (token: string) => void;
          "error-callback"?: () => void;
        }
      ) => string;
      remove: (id: string) => void;
    };
  }
}

// 사이트키는 공개 값 — 커밋 안전. env가 있으면 우선(로컬/스테이징 오버라이드용)
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "0x4AAAAAAD4xGhAGzw0YTty8";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("turnstile_script_failed"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** 토큰 1개 발급. 사이트키 미설정·실패·15초 타임아웃이면 null. */
export async function getTurnstileToken(): Promise<string | null> {
  if (!SITE_KEY) return null;
  try {
    await loadScript();
  } catch {
    return null;
  }
  return new Promise((resolve) => {
    const el = document.createElement("div");
    document.body.appendChild(el);
    let settled = false;
    let widgetId: string | undefined;
    const done = (token: string | null) => {
      if (settled) return;
      settled = true;
      try {
        if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      } catch { /* noop */ }
      el.remove();
      resolve(token);
    };
    const timeout = setTimeout(() => done(null), 15000);
    try {
      widgetId = window.turnstile!.render(el, {
        sitekey: SITE_KEY,
        callback: (token) => {
          clearTimeout(timeout);
          done(token);
        },
        "error-callback": () => {
          clearTimeout(timeout);
          done(null);
        },
      });
    } catch {
      clearTimeout(timeout);
      done(null);
    }
  });
}
