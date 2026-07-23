/**
 * 카카오톡 공유 헬퍼 (Kakao.Share) — 클립보드 복사 마찰 제거
 *
 * 한국 유저의 공유 1채널은 카톡인데, navigator.share → 클립보드 폴백은
 * "복사 → 카톡 열기 → 방 선택 → 붙여넣기" 4단 마찰이다. Kakao.Share.sendDefault는
 * 탭 → 방 선택 → 전송으로 끝나고, 받은 사람에게 이미지+버튼 카드가 바로 뜬다.
 *
 * 키 정책은 Turnstile과 동일한 무중단 패턴: NEXT_PUBLIC_KAKAO_JS_KEY가 빌드에 없으면
 * 모든 함수가 false를 반환하고, 호출부는 기존 navigator.share/클립보드 경로로 폴백한다.
 * (카카오 디벨로퍼스 앱 등록 + 플랫폼 도메인 jaemul.kr 등록 후 키만 넣으면 활성화)
 */

type KakaoSdk = {
  isInitialized: () => boolean;
  init: (key: string) => void;
  Share: {
    sendDefault: (opts: {
      objectType: "feed";
      content: { title: string; description: string; imageUrl: string; link: { mobileWebUrl: string; webUrl: string } };
      buttons?: { title: string; link: { mobileWebUrl: string; webUrl: string } }[];
    }) => void;
  };
};

declare global {
  interface Window {
    Kakao?: KakaoSdk;
  }
}

const JS_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY;
// integrity 고정 배포본 — SDK 버전 교체 시 카카오 문서의 해시로 함께 갱신할 것
const SDK_SRC = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js";

let sdkPromise: Promise<boolean> | null = null;

function loadSdk(): Promise<boolean> {
  if (!JS_KEY) return Promise.resolve(false);
  if (window.Kakao?.isInitialized()) return Promise.resolve(true);
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => {
      try {
        if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(JS_KEY);
        resolve(window.Kakao?.isInitialized() ?? false);
      } catch {
        resolve(false);
      }
    };
    s.onerror = () => {
      sdkPromise = null;
      resolve(false);
    };
    document.head.appendChild(s);
  });
  return sdkPromise;
}

export type KakaoShareCard = {
  title: string;
  description: string;
  /** 절대 URL 필수 (카톡 서버가 fetch) — 보통 `${location.origin}/api/og/...` */
  imageUrl: string;
  url: string;
  /** 받은 사람의 행동 버튼 (최대 2개) — 없으면 "자세히 보기" 1개 */
  buttons?: { title: string; url: string }[];
};

/** 카톡 공유 시도. 키 미설정·SDK 실패 시 false — 호출부가 기존 공유 경로로 폴백한다. */
export async function shareToKakao(card: KakaoShareCard): Promise<boolean> {
  try {
    if (!(await loadSdk())) return false;
    window.Kakao!.Share.sendDefault({
      objectType: "feed",
      content: {
        title: card.title,
        description: card.description,
        imageUrl: card.imageUrl,
        link: { mobileWebUrl: card.url, webUrl: card.url },
      },
      buttons: (card.buttons ?? [{ title: "자세히 보기", url: card.url }]).map((b) => ({
        title: b.title,
        link: { mobileWebUrl: b.url, webUrl: b.url },
      })),
    });
    return true;
  } catch {
    return false;
  }
}
