import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { vesselBySlug } from "@/lib/vessel-types";
import { normalizeMbti } from "@/lib/combo";
import { ResultView } from "@/components/ResultView";

/**
 * 성격 조합 카드 공유 랜딩 — /r/[slug]/c/[t] (t = 성격유형 4글자)
 * 경로 세그먼트라 기본 /r/[slug]는 정적 유지, 조합 OG 이미지는 여기서만.
 */

type Props = { params: Promise<{ slug: string; t: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, t } = await params;
  const vessel = vesselBySlug(slug);
  const mbti = normalizeMbti(t);
  if (!vessel || !mbti) return {};
  const title = `${vessel.name} × ${mbti} — 나의 재물그릇 조합`;
  return {
    title,
    description: `"${vessel.tagline}" · 내 재물그릇도 무료로 확인해 보세요`,
    openGraph: {
      title,
      description: `"${vessel.tagline}" · 내 재물그릇도 무료로 확인해 보세요`,
      images: [{ url: `/api/og/${vessel.slug}?t=${mbti}`, width: 1200, height: 1200 }],
    },
  };
}

export default async function ComboSharePage({ params }: Props) {
  const { slug, t } = await params;
  const vessel = vesselBySlug(slug);
  const mbti = normalizeMbti(t);
  if (!vessel || !mbti) notFound();
  return <ResultView vessel={vessel} initialMbti={mbti} />;
}
