import type { Metadata } from "next";
import Link from "next/link";
import { VESSEL_TYPES } from "@/lib/vessel-types";
import { PremiumVessel } from "@/components/PremiumVessel";

/**
 * 16유형 도감 (바이럴 표면 — "전부 구경하기" 수요)
 * 각 카드는 유형 상세(/r/[slug])로 — 생년월일 정보 없음, 순수 유형 갤러리.
 */

export const metadata: Metadata = {
  title: "16가지 재물그릇 도감 — 나는 어떤 그릇일까",
  description: "실제 만세력 계산으로 나오는 16가지 재물그릇을 한눈에. 내 그릇은 무료로 확인",
};

export default function TypesPage() {
  const all = Object.values(VESSEL_TYPES).sort((a, b) => a.per100 - b.per100);
  return (
    <div className="px-5 pt-10 pb-8">
      <p className="text-center text-[13px] font-bold tracking-[0.3em]" style={{ color: "var(--gold-deep)" }}>
        재물그릇 도감
      </p>
      <h1 className="mt-2 text-center text-[24px] font-extrabold">16가지 그릇, 전부 구경하기</h1>
      <p className="mt-1 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>
        희귀한 그릇부터 — 숫자는 8만 사주 분포 실측값
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3">
        {all.map((v) => (
          <Link
            key={v.slug}
            href={`/r/${v.slug}?from=types`}
            className="vessel-card card flex flex-col items-center px-3 py-5 active:scale-[0.97]"
          >
            <PremiumVessel code={v.code} size={84} />
            <p className="mt-2 text-[16px] font-extrabold">{v.name}</p>
            <p className="mt-0.5 text-center text-[11.5px] leading-snug" style={{ color: "var(--ink-soft)" }}>
              {v.tagline}
            </p>
            <p className="mt-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ background: "var(--gold-soft)", color: "var(--gold-deep)" }}>
              100명 중 {v.per100}명
            </p>
          </Link>
        ))}
      </div>

      <Link href="/input" className="btn-primary mt-8">내 그릇은 뭘까 — 무료 확인</Link>
    </div>
  );
}
