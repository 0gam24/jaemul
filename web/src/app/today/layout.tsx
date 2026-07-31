import type { Metadata } from "next";

/**
 * 오늘의 재물운 전용 타이틀 — page.tsx가 클라이언트 컴포넌트라 여기서 내보낸다.
 * "오늘의 재물운"은 검색 수요가 꾸준한 키워드라 홈과 타이틀이 겹치면 아깝다.
 */
export const metadata: Metadata = {
  title: "오늘의 재물운 | 재물그릇",
  description: "내 사주 기준으로 계산하는 오늘의 돈 흐름. 다음 돈길 날짜까지 무료로 확인하세요.",
};

export default function TodayLayout({ children }: { children: React.ReactNode }) {
  return children;
}
