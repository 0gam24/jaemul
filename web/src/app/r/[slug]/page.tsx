import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VESSEL_TYPES, vesselBySlug } from "@/lib/vessel-types";
import { ResultView } from "@/components/ResultView";

/**
 * 유형 결과 페이지 — searchParams를 읽지 않아 16페이지 전부 정적 프리렌더.
 * (공유 링크·OG 스크레이퍼가 엣지 캐시에서 바로 받는다)
 * 성격 4글자 조합 공유는 /r/[slug]/c/[t] 전용 경로 사용.
 */

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return Object.values(VESSEL_TYPES).map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vessel = vesselBySlug(slug);
  if (!vessel) return {};
  const title = `${vessel.name} — 100명 중 ${vessel.per100}명의 재물그릇`;
  return {
    title,
    description: `"${vessel.tagline}" · 내 재물그릇도 무료로 확인해 보세요`,
    openGraph: {
      title,
      description: `"${vessel.tagline}" · 내 재물그릇도 무료로 확인해 보세요`,
      images: [{ url: `/api/og/${vessel.slug}`, width: 1200, height: 1200 }],
    },
  };
}

export default async function ResultPage({ params }: Props) {
  const { slug } = await params;
  const vessel = vesselBySlug(slug);
  if (!vessel) notFound();
  return <ResultView vessel={vessel} initialMbti={null} />;
}
