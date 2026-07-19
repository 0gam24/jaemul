import Link from "next/link";
import { VESSEL_TYPES, ELEMENT_COLORS } from "@/lib/vessel-types";
import { VesselCharacter } from "@/components/VesselCharacter";

/**
 * 랜딩 — 서버 컴포넌트 + CSS 애니메이션만 사용.
 * 모션 라이브러리·하이드레이션 없이 첫 페인트에 히어로가 바로 보인다 (LCP 1.5s 게이트).
 * 스크롤 리빌은 CSS Scroll-Driven Animations(@supports 폴백: 그냥 보임).
 */

const vessels = Object.values(VESSEL_TYPES);

export default function Home() {
  return (
    <div className="overflow-x-hidden">
      {/* ① 훅 */}
      <section className="flex min-h-[88dvh] flex-col items-center justify-center px-6 text-center">
        <p className="fade-up text-[14px] font-semibold" style={{ color: "var(--gold-deep)" }}>
          AI라서 전원 다 봐드립니다
        </p>
        <h1
          className="fade-up fade-up-1 mt-3 text-[34px] font-extrabold leading-snug"
          style={{ fontFamily: "var(--font-display)" }}
        >
          내 재물그릇,
          <br />
          상위 <span className="text-[42px]" style={{ color: "var(--gold)" }}>?%</span>
        </h1>
        {/* 공유 카드와 동일한 세계관 — 빛나는 항아리 + 넘치는 동전 (CSS만, LCP 게이트 준수) */}
        <div className="fade-up fade-up-2 hero-jar mt-6">
          <span className="hero-coin hero-coin-1" aria-hidden><i /></span>
          <span className="hero-coin hero-coin-2" aria-hidden><i /></span>
          <span className="hero-coin hero-coin-3" aria-hidden><i /></span>
          <span className="hero-spark hero-spark-1" aria-hidden>✦</span>
          <span className="hero-spark hero-spark-2" aria-hidden>✦</span>
          <VesselCharacter code="WROJ" size={155} />
        </div>
        <p className="fade-up fade-up-3 mt-5 text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          생년월일시 하나로 확인하는 나의 그릇 16유형
        </p>
        <div className="bob mt-14 text-[13px]" style={{ color: "var(--ink-faint)" }} aria-hidden>
          아래로 내려보세요 ↓
        </div>
      </section>

      {/* ② 유형 미리보기 스트림 (정직한 콘텐츠 미리보기 — 가짜 리뷰 아님) */}
      <section className="py-10">
        <h2 className="scroll-reveal px-6 text-center text-[20px] font-bold leading-snug">
          그릇마다 돈이 고이는 방식이 달라요
        </h2>
        <div className="relative mt-6 overflow-hidden" aria-hidden>
          <div className="marquee flex w-max gap-3">
            {[...vessels, ...vessels].map((v, i) => (
              <div key={`${v.code}-${i}`} className="card flex shrink-0 items-center gap-2 px-4 py-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: ELEMENT_COLORS[v.element] }} />
                <span className="text-[14px] font-bold">{v.name}</span>
                <span className="text-[13px]" style={{ color: "var(--ink-soft)" }}>{v.tagline}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ③ 16유형 그리드 */}
      <section className="px-5 py-10">
        <h2 className="scroll-reveal text-center text-[20px] font-bold">
          당신은 16개 그릇 중 하나예요
        </h2>
        <p className="scroll-reveal mt-2 text-center text-[14px]" style={{ color: "var(--ink-soft)" }}>
          제일 희귀한 그릇은 100명 중 1명뿐
        </p>
        <div className="mt-6 grid grid-cols-4 gap-2">
          {vessels.map((v) => (
            <div key={v.code} data-tip={v.tagline} className="scroll-reveal vessel-card card flex flex-col items-center px-1 py-3">
              <VesselCharacter code={v.code} size={58} />
              <span className="mt-1 text-[12.5px] font-bold leading-tight">{v.name}</span>
              <span className="mt-0.5 text-[10.5px]" style={{ color: "var(--ink-faint)" }}>100명 중 {v.per100}명</span>
            </div>
          ))}
        </div>
      </section>

      {/* ④ 병오년 시즌 훅 */}
      <section className="px-6 py-12">
        <div className="scroll-reveal card px-6 py-7 text-center" style={{ background: "var(--gold-soft)", borderColor: "#eeddc2" }}>
          <p className="text-[13px] font-bold tracking-widest" style={{ color: "var(--gold-deep)" }}>
            2026 丙午
          </p>
          <p className="mt-2 text-[19px] font-bold leading-snug">
            60년 만의 붉은 말의 해,
            <br />
            돈의 기운이 크게 움직이는 해
          </p>
          <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            움직임이 큰 해일수록, 내 그릇의 모양을
            <br />
            먼저 아는 사람이 유리해요
          </p>
        </div>
      </section>

      {/* ⑤ 가격 앵커 + CTA */}
      <section className="px-6 pb-16 pt-4 text-center">
        <p className="scroll-reveal text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          철학관 20만원이 묻는 것,
          <br />
          여기선 <b style={{ color: "var(--ink)" }}>무료</b>로 먼저 확인하세요
        </p>
        <div className="scroll-reveal">
          <Link href="/input" className="btn-primary mt-6">
            무료로 내 그릇 확인
          </Link>
        </div>
        <p className="scroll-reveal mt-4 text-[12px]" style={{ color: "var(--ink-faint)" }}>
          가입 없음 · 생년월일 저장 안 함 · 10초 완성
        </p>
      </section>
    </div>
  );
}
