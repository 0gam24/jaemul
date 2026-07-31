import Link from "next/link";
import { VESSEL_TYPES, ELEMENT_COLORS } from "@/lib/vessel-types";
import { PremiumVessel } from "@/components/PremiumVessel";

/**
 * 랜딩 — 서버 컴포넌트 + CSS 애니메이션만 사용.
 * 모션 라이브러리·하이드레이션 없이 첫 페인트에 히어로가 바로 보인다 (LCP 1.5s 게이트).
 * 스크롤 리빌은 CSS Scroll-Driven Animations(@supports 폴백: 그냥 보임).
 */

const vessels = Object.values(VESSEL_TYPES);

export default function Home() {
  return (
    <div className="overflow-x-hidden pb-24">
      {/* ① 훅 — 첫 화면에서 바로 행동할 수 있어야 한다 (CTA 없는 히어로는 광고 이탈 지점) */}
      <section className="flex min-h-[88dvh] flex-col items-center justify-center px-6 text-center">
        <p className="fade-up text-[14px] font-semibold" style={{ color: "var(--gold-deep)" }}>
          AI라서 대기도, 예약도 없어요
        </p>
        {/* 지표는 사이트 전체와 동일하게 "100명 중 N명"(희귀도) 하나로 통일 —
            여기만 "상위 %"(우열)를 쓰면 결과 화면에서 기대가 어긋난다 */}
        <h1
          className="fade-up fade-up-1 mt-3 text-[34px] font-extrabold leading-snug"
          style={{ fontFamily: "var(--font-display)" }}
        >
          내 재물그릇,
          <br />
          100명 중 <span className="text-[42px]" style={{ color: "var(--gold)" }}>몇 명?</span>
        </h1>
        {/* 공유 카드와 동일한 세계관 — 빛나는 항아리 + 넘치는 동전 (CSS만, LCP 게이트 준수) */}
        <div className="fade-up fade-up-2 hero-jar mt-6">
          <span className="hero-coin hero-coin-1" aria-hidden><i /></span>
          <span className="hero-coin hero-coin-2" aria-hidden><i /></span>
          <span className="hero-coin hero-coin-3" aria-hidden><i /></span>
          <span className="hero-spark hero-spark-1" aria-hidden>✦</span>
          <span className="hero-spark hero-spark-2" aria-hidden>✦</span>
          <PremiumVessel code="WROJ" size={155} priority />
        </div>
        <p className="fade-up fade-up-3 mt-5 text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          생년월일시만 넣으면, 16가지 중 내 그릇이 나와요
        </p>
        <div className="fade-up fade-up-3">
          <Link href="/input" className="btn-primary mt-7">
            무료로 내 그릇 확인
          </Link>
        </div>
        {/* 개인정보 안심 문구는 히어로에 — 사주 서비스 최대 진입장벽이라 맨 아래 두면 늦는다 */}
        <p className="fade-up fade-up-3 mt-3 text-[12px]" style={{ color: "var(--ink-faint)" }}>
          가입 없이 · 생년월일 저장 없이 · 10초면 끝
        </p>
        <div className="bob mt-10 text-[13px]" style={{ color: "var(--ink-faint)" }} aria-hidden>
          16가지 그릇 구경은 아래로 ↓
        </div>
      </section>

      {/* ② 유형 미리보기 스트림 (정직한 콘텐츠 미리보기 — 가짜 리뷰 아님) */}
      <section className="py-10">
        <h2 className="scroll-reveal px-6 text-center text-[20px] font-bold leading-snug">
          그릇마다 돈이 고이는 방식이 달라요
        </h2>
        {/* 좌우 페이드 마스크 — 카드가 뚝 잘려 보이면 버그처럼 읽힌다 */}
        <div className="marquee-fade relative mt-6 overflow-hidden" aria-hidden>
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
          내 그릇도 이 16개 중 하나예요
        </h2>
        <p className="scroll-reveal mt-2 text-center text-[14px]" style={{ color: "var(--ink-soft)" }}>
          제일 희귀한 그릇은 100명 중 1명뿐
        </p>
        {/* 카드마다 유형 상세로 링크 — 방문자에겐 구경거리, 검색엔진에는 색인 입구 16개 */}
        <div className="mt-6 grid grid-cols-4 gap-2">
          {vessels.map((v) => (
            <Link key={v.code} href={`/r/${v.slug}`} data-tip={v.tagline} className="scroll-reveal vessel-card card flex flex-col items-center px-1 py-3">
              <PremiumVessel code={v.code} size={58} />
              <span className="mt-1 text-[12.5px] font-bold leading-tight">{v.name}</span>
              <span className="mt-0.5 text-[10.5px]" style={{ color: "var(--ink-faint)" }}>100명 중 {v.per100}명</span>
            </Link>
          ))}
        </div>
      </section>

      {/* ④ 병오년 시즌 훅 */}
      <section className="px-6 py-12">
        <div className="scroll-reveal card px-6 py-7 text-center" style={{ background: "var(--gold-soft)", borderColor: "#eeddc2" }}>
          {/* 한자는 신뢰, 한글은 이해 — 병기 필수 */}
          <p className="text-[13px] font-bold tracking-widest" style={{ color: "var(--gold-deep)" }}>
            2026 丙午(병오)
          </p>
          {/* "~해"로 끝나는 줄 연속 금지 + "불의 해라"로 근거 부여(권위의 출처는 계산) */}
          <p className="mt-2 text-[19px] font-bold leading-snug">
            붉은 말의 해는 60년 만이에요
            <br />
            불의 해라 돈이 빨리 돌고, 그만큼 빨리 샙니다
          </p>
          <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            돈이 빨리 도는 해엔, 자기 그릇을 아는 사람 통장에 먼저 남아요.
            <br />
            내 그릇 확인은 10초면 끝나요. 무료고요
          </p>
        </div>
      </section>

      {/* ⑤ 가격 앵커 + CTA */}
      <section className="px-6 pb-16 pt-4 text-center">
        <p className="scroll-reveal text-[15px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          철학관에서 20만원 내고 듣는 이야기,
          <br />
          여기선 <b style={{ color: "var(--ink)" }}>무료</b>로 먼저 확인하세요
        </p>
        <div className="scroll-reveal">
          <Link href="/input" className="btn-primary mt-6">
            무료로 내 그릇 확인
          </Link>
        </div>
        {/* 유료 구간 사전 고지 — "무료"만 외치다 결과 화면에서 자물쇠를 만나면 반감이 생긴다 */}
        <p className="scroll-reveal mt-4 text-[13px]" style={{ color: "var(--ink-soft)" }}>
          기본 유형은 무료예요. 12개월 상세 풀이만 990원
        </p>
        <p className="scroll-reveal mt-2 text-[12px]" style={{ color: "var(--ink-faint)" }}>
          가입 없이 · 생년월일 저장 없이 · 10초면 끝
        </p>
      </section>

      {/* 스티키 CTA — 어느 지점에서 마음이 움직여도 버튼이 손 닿는 곳에 (히어로 지나면 등장) */}
      <div className="sticky-cta" aria-hidden={false}>
        <Link href="/input" className="btn-primary w-full max-w-md">
          무료로 내 그릇 확인
        </Link>
      </div>
    </div>
  );
}
