import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { SourceCapture } from "@/components/SourceCapture";
import "./globals.css";

const FONT_CSS =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export const metadata: Metadata = {
  title: "재물그릇 — 내 재물그릇, 100명 중 몇 명일까",
  description:
    "생년월일시로 확인하는 나의 재물그릇 16유형. AI가 전원 다 봐드립니다 — 무료.",
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
            하이드레이션 불일치도 없다. TODO(M4 배포): next/font/local 셀프 호스팅으로 교체 */}
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="anonymous" />
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
