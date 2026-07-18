import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { vesselBySlug } from "@/lib/vessel-types";
import { VesselCharacter } from "@/components/VesselCharacter";

/**
 * 유료 티저 카드 랜딩 (바이럴 — 결제자가 마케터)
 * URL엔 그릇 유형 + 달 숫자만. 생년월일·풀이 내용 절대 미포함 (절대규칙 5)
 * 받은 사람의 답("네 달은 언제?")은 본인 결제로만 열린다.
 */

type Props = { params: Promise<{ slug: string; m: string }> };

function parseMonth(m: string): number | null {
  const n = Number(m);
  return Number.isInteger(n) && n >= 1 && n <= 12 ? n : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, m } = await params;
  const vessel = vesselBySlug(slug);
  const month = parseMonth(m);
  if (!vessel || !month) return {};
  const title = `내 돈길 열리는 달은 ${month}월 — 네 달은 언제야?`;
  const description = `${vessel.name}의 사주로 계산한 결과예요. 내 그릇은 무료 확인 · 돈길 달은 상세 풀이에서`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og/${vessel.slug}?m=${month}`, width: 1200, height: 1200 }],
    },
  };
}

export default async function TeaserPage({ params }: Props) {
  const { slug, m } = await params;
  const vessel = vesselBySlug(slug);
  const month = parseMonth(m);
  if (!vessel || !month) notFound();

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center px-6 text-center">
      <p className="text-[13px] font-bold tracking-[0.3em]" style={{ color: "var(--gold-deep)" }}>
        내 돈길 열리는 달
      </p>
      <div className="mt-5">
        <VesselCharacter code={vessel.code} size={150} />
      </div>
      <p className="mt-4 text-[64px] font-extrabold leading-none" style={{ color: "var(--gold)", fontFamily: "var(--font-display)" }}>
        {month}월
      </p>
      <p className="mt-3 text-[15px] font-medium" style={{ color: "var(--ink-soft)" }}>
        {vessel.name}의 사주로 계산한 달이에요.
        <br />
        당신의 달은 완전히 다를 수 있어요.
      </p>
      <div className="card mt-6 w-full px-5 py-4 text-[15px] font-semibold">
        네 돈길 달은 언제야?
        <span className="mt-1 block text-[13px] font-normal" style={{ color: "var(--ink-faint)" }}>
          내 그릇은 무료로 바로 나와요 — 돈길 달은 상세 풀이에서 열려요
        </span>
      </div>
      <Link href="/input" className="btn-primary mt-6">
        내 그릇 무료로 확인하기
      </Link>
      <p className="mt-4 text-[12px]" style={{ color: "var(--ink-faint)" }}>
        실제 만세력 계산 · 생년월일은 저장하지 않아요
      </p>
    </div>
  );
}
