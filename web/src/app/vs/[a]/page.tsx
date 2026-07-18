import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { VESSEL_TYPES, vesselBySlug } from "@/lib/vessel-types";
import { VesselCharacter } from "@/components/VesselCharacter";

type Props = { params: Promise<{ a: string }> };

export function generateStaticParams() {
  return Object.values(VESSEL_TYPES).map((v) => ({ a: v.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { a } = await params;
  const vessel = vesselBySlug(a);
  if (!vessel) return {};
  const title = `${vessel.name}이 그릇 대결을 걸었어요 — 재물그릇`;
  const description = "생년월일시만 넣으면 10초 만에 대결 결과가 나와요 · 무료";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og/${vessel.slug}?vs=1`, width: 1200, height: 1200 }],
    },
  };
}

export default async function ChallengePage({ params }: Props) {
  const { a } = await params;
  const vessel = vesselBySlug(a);
  if (!vessel) notFound();

  return (
    <div className="flex min-h-[80dvh] flex-col items-center justify-center px-6 text-center">
      <p className="text-[14px] font-semibold" style={{ color: "var(--gold-deep)" }}>
        그릇 대결 신청이 도착했어요
      </p>
      <div className="mt-6">
        <VesselCharacter code={vessel.code} size={135} />
      </div>
      <h1 className="mt-4 text-[26px] font-extrabold">
        상대는 {vessel.name}
      </h1>
      <p className="mt-1 text-[15px]" style={{ color: "var(--ink-soft)" }}>
        “{vessel.tagline}”
      </p>
      <p className="mt-6 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        당신 그릇을 꺼내면 바로 대결 결과가 나와요.
        <br />
        생년월일시만, 10초면 끝.
      </p>
      <Link href={`/input?vs=${vessel.slug}`} className="btn-primary mt-8">
        내 그릇 꺼내서 대결하기
      </Link>
      <p className="mt-4 text-[12px]" style={{ color: "var(--ink-faint)" }}>
        무료 · 가입 없음 · 생년월일 저장 안 함
      </p>
    </div>
  );
}
