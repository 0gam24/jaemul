import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { vesselBySlug, type VesselType } from "@/lib/vessel-types";
import { vsVerdict } from "@/lib/combo";
import { VesselCharacter } from "@/components/VesselCharacter";
import { VsShareButton } from "@/components/VsShareButton";

type Props = { params: Promise<{ a: string; b: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { a, b } = await params;
  const va = vesselBySlug(a);
  const vb = vesselBySlug(b);
  if (!va || !vb) return {};
  const verdict = vsVerdict(va, vb);
  const title = `${va.name} vs ${vb.name} — ${verdict.title}`;
  const description = "그릇 대결 결과 · 내 재물그릇도 무료로 확인해 보세요";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [{ url: `/api/og/${va.slug}?b=${vb.slug}`, width: 1200, height: 1200 }],
    },
  };
}

function Corner({ vessel, label }: { vessel: VesselType; label: string }) {
  return (
    <div className="card flex flex-1 flex-col items-center px-3 py-5">
      <p className="text-[11px] font-semibold" style={{ color: "var(--ink-faint)" }}>{label}</p>
      <VesselCharacter code={vessel.code} size={96} />
      <p className="mt-1 text-[17px] font-extrabold">{vessel.name}</p>
      <p className="mt-0.5 text-center text-[12px] leading-snug" style={{ color: "var(--ink-soft)" }}>
        {vessel.tagline}
      </p>
      <p className="mt-1 text-[11px]" style={{ color: "var(--gold-deep)" }}>100명 중 {vessel.per100}명</p>
    </div>
  );
}

export default async function VsResultPage({ params }: Props) {
  const { a, b } = await params;
  const va = vesselBySlug(a);
  const vb = vesselBySlug(b);
  if (!va || !vb) notFound();
  const verdict = vsVerdict(va, vb);

  return (
    <div className="px-5 pt-10 pb-8">
      <p className="text-center text-[13px] font-semibold tracking-wide" style={{ color: "var(--gold-deep)" }}>
        그릇 대결 결과
      </p>

      {/* 라벨은 열람자 중립 — 이 링크는 제3자에게도 공유된다 */}
      <div className="mt-5 flex items-stretch gap-2">
        <Corner vessel={va} label="도전장 낸 그릇" />
        <div className="flex items-center text-[18px] font-extrabold" style={{ color: "var(--ink-faint)" }}>vs</div>
        <Corner vessel={vb} label="받아친 그릇" />
      </div>

      <div className="card mt-4 px-5 py-5 text-center" style={{ background: "var(--gold-soft)", borderColor: "#eeddc2" }}>
        <p className="text-[19px] font-extrabold">{verdict.title}</p>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          {verdict.detail}
        </p>
      </div>

      <div className="card mt-3 px-5 py-4">
        <p className="text-[13px] font-bold" style={{ color: "var(--ink-faint)" }}>서로에 대해 알아둘 것</p>
        <p className="mt-2 text-[14px] leading-relaxed">
          <b>{va.name}</b>은 “{va.fact}”
        </p>
        <p className="mt-1.5 text-[14px] leading-relaxed">
          <b>{vb.name}</b>은 “{vb.fact}”
        </p>
      </div>

      <VsShareButton a={va} b={vb} verdictTitle={verdict.title} />

      <div className="mt-4 flex justify-center gap-5 text-[13px]" style={{ color: "var(--ink-soft)" }}>
        <Link href={`/r/${vb.slug}`} className="underline underline-offset-2">이 그릇 자세히 보기</Link>
        <Link href={`/vs/${vb.slug}`} className="underline underline-offset-2">다른 친구에게 대결 걸기</Link>
      </div>
    </div>
  );
}
