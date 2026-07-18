import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SourceCapture } from "@/components/SourceCapture";
import "./globals.css";

// 셀프호스팅 (M4) — public/fonts/pretendard, 브라우저는 화면에 필요한 subset woff2만 받는다
const FONT_CSS = "/fonts/pretendard/pretendardvariable-dynamic-subset.css";

const TITLE = "재물그릇 — 내 재물그릇, 100명 중 몇 명일까";
const DESC = "생년월일시로 확인하는 나의 재물그릇 16유형. AI가 전원 다 봐드립니다 — 무료.";

export const metadata: Metadata = {
  // 절대 URL 기준점 — 없으면 OG 이미지가 localhost로 생성돼 카톡 미리보기가 깨진다
  metadataBase: new URL("https://jaemul.kr"),
  title: TITLE,
  description: DESC,
  openGraph: {
    // 카톡 미리보기 3층 설계: 이미지=훅("상위 ?%") / title=정체 / description=유형명 미끼
    title: "재물그릇 — AI 재물운 사주 16유형",
    description: "옹달샘형? 가마솥형? 금고형? 생년월일만 넣으면 10초 — 무료, 회원가입 없음.",
    siteName: "재물그릇",
    type: "website",
    locale: "ko_KR",
    images: [{ url: "/api/og/home", width: 800, height: 418 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "재물그릇 — AI 재물운 사주 16유형",
    description: "옹달샘형? 가마솥형? 금고형? 생년월일만 넣으면 10초 — 무료, 회원가입 없음.",
    images: ["/api/og/home"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf7f2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* 폰트 CSS 비블로킹 로드 — 스크립트 삽입 링크는 렌더를 막지 않고, React 트리 밖이라
            하이드레이션 불일치도 없다 */}
        <link rel="preload" as="style" href={FONT_CSS} />
        <noscript>
          <link rel="stylesheet" href={FONT_CSS} />
        </noscript>
      </head>
      <body>
        <Script id="font-css-loader" strategy="beforeInteractive">
          {`var l=document.createElement('link');l.rel='stylesheet';l.href='${FONT_CSS}';document.head.appendChild(l);`}
        </Script>
        <SourceCapture />
        <div className="shell">
          <main className="flex-1">{children}</main>
          <footer className="px-6 py-6 text-center text-[11px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
            본 서비스는 AI가 생성한 콘텐츠이며 재미와 참고용입니다
            <span className="mt-2 block">
              <a href="/terms" className="underline underline-offset-2">이용약관</a>
              {" · "}
              <a href="/privacy" className="underline underline-offset-2">개인정보처리방침</a>
              {" · "}
              <a href="/refund" className="underline underline-offset-2">환불정책</a>
            </span>
            <span className="mt-2 block">
              스마트데이터샵 · 대표 김준혁 · 사업자등록번호 406-06-34485
              <br />
              인천광역시 계양구 새벌로 88 · smartdatashop@gmail.com
            </span>
          </footer>
        </div>
      </body>
    </html>
  );
}
