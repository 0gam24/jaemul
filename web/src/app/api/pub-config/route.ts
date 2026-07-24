import { NextResponse } from "next/server";

/**
 * 공개 가능한 클라이언트 설정 — 빌드 타임 주입(NEXT_PUBLIC_*)이 CI에서 누락될 때의 런타임 경로.
 *
 * 카카오 JavaScript 키는 성격상 공개 값이다(모든 방문자의 번들에 노출되는 게 정상이고,
 * 보호는 카카오 디벨로퍼스의 도메인 등록이 담당). 그래서 워커 시크릿에 있는 값을
 * 이 엔드포인트로 내려줘도 보안 손실이 없다 — 시크릿·비공개 키는 절대 여기 추가하지 말 것.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    { kakaoJsKey: process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? null },
    { headers: { "cache-control": "public, max-age=3600" } }
  );
}
