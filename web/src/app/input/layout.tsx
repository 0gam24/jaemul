import type { Metadata } from "next";

/**
 * 입력 페이지 전용 타이틀 — page.tsx가 클라이언트 컴포넌트라 여기서 내보낸다.
 * 홈 타이틀을 그대로 상속하면 중복 타이틀로 색인에 불리하다.
 */
export const metadata: Metadata = {
  title: "무료 재물그릇 확인 | 재물그릇",
  description: "생년월일시만 넣으면 10초 만에 16가지 중 내 재물그릇이 나와요. 가입 없이, 저장 없이, 무료.",
};

export default function InputLayout({ children }: { children: React.ReactNode }) {
  return children;
}
