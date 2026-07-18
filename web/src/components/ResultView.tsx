"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Link from "next/link";
// LazyMotion + m: 풀 모션 엔진 대신 domAnimation 서브셋만 로드 (초기 번들 절감)
import { LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import type { SajuResult } from "ssaju";
import { VESSEL_TYPES, type VesselType } from "@/lib/vessel-types";
import { comboFact, normalizeMbti } from "@/lib/combo";
import { loadResult } from "@/lib/result-store";
import { track } from "@/lib/track";
import { VesselCharacter } from "./VesselCharacter";

const EL_COLOR: Record<string, string> = {
  목: "var(--el-mok)", 화: "var(--el-hwa)", 토: "var(--el-to)", 금: "var(--el-geum)", 수: "var(--el-su)",
};

/* 리빌 타임라인 (초) — 가챠 3.5초 상한 */
const T = { pillars: 0.15, liquid: 0.9, percent: 2.1, title: 2.6, fact: 3.1 };

export function ResultView({ vessel, initialMbti }: { vessel: VesselType; initialMbti?: string | null }) {
  const reduced = useReducedMotion();
  const [isOwner, setIsOwner] = useState(false);
  const [saju, setSaju] = useState<SajuResult | null>(null);
  const [reveal, setReveal] = useState(false);
  const [ready, setReady] = useState(false); // 리빌 종료 → 하단 섹션 표시
  const [skipped, setSkipped] = useState(false); // 탭 스킵 → 즉시 엔드프레임
  const live = reveal && !skipped;

  function skip() {
    setSkipped(true);
    setReady(true);
  }

  // 플래그는 1회만 소비(ref 가드 — StrictMode 2회 실행에도 리빌 유지),
  // useLayoutEffect로 페인트 전에 결정(엔드프레임 스포일러 플래시 방지),
  // 스토리지 차단 브라우저에서도 크래시 없이 정적 화면으로 폴백.
  const decided = useRef<boolean | null>(null);
  useLayoutEffect(() => {
    if (decided.current === null) {
      let want = false;
      try {
        want = sessionStorage.getItem("jaemul.reveal") === "1";
        sessionStorage.removeItem("jaemul.reveal");
      } catch {
        want = false;
      }
      decided.current = want;
    }
    const wantReveal = decided.current;
    const stored = loadResult();
    const owner = stored?.slug === vessel.slug;
    setIsOwner(owner);
    setReveal(wantReveal && !reduced);
    if (owner && stored) {
      import("@/lib/manseryeok").then(({ getSaju }) => setSaju(getSaju(stored.input).saju));
    }
    if (!wantReveal || reduced) setReady(true);
    else {
      const t = setTimeout(() => setReady(true), (T.fact + 0.7) * 1000);
      return () => clearTimeout(t);
    }
  }, [vessel.slug, reduced]);

  // 햅틱 — 칭호 등장 순간 1회
  useEffect(() => {
    if (!live) return;
    const t = setTimeout(() => navigator.vibrate?.(15), T.title * 1000);
    return () => clearTimeout(t);
  }, [live]);


  return (
    <LazyMotion features={domAnimation} strict>
    <div className="px-5 pt-8 pb-6">
      {/* 리빌 중 탭 스킵 — 어디를 눌러도 즉시 엔드프레임으로 */}
      {live && !ready && (
        <button
          onClick={skip}
          aria-label="연출 건너뛰기"
          className="fixed inset-0 z-40 flex items-end justify-center pb-8"
          style={{ background: "transparent" }}
        >
          <span
            className="rounded-full px-4 py-1.5 text-[12px] font-semibold"
            style={{ background: "rgba(43,33,24,0.55)", color: "#fff" }}
          >
            탭하면 바로 보기
          </span>
        </button>
      )}

      {/* ── 히어로: 팔자 → 그릇 → % → 칭호 → 팩폭 ──
          key로 스킵 시 리마운트 → 모든 연출 없이 완성된 엔드프레임이 즉시 뜬다 */}
      <div key={live ? "live" : "static"} className="flex flex-col items-center text-center">
        {isOwner && saju && <PillarStrip saju={saju} reveal={live} />}

        <m.div
          initial={live ? { opacity: 0, scale: 0.9 } : false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: live ? T.pillars + 0.3 : 0, ease: [0.23, 1, 0.32, 1] }}
          className="relative mt-4"
        >
          {/* 엔드프레임 광 — 칭호 터지는 순간 금빛이 퍼졌다 사라진다 */}
          {live && (
            <m.div
              aria-hidden
              className="absolute inset-[-30%] rounded-full"
              style={{ background: "radial-gradient(closest-side, rgba(217,142,50,0.5), transparent 70%)" }}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: [0, 0.9, 0], scale: [0.5, 1.5, 1.9] }}
              transition={{ delay: T.title, duration: 0.9, ease: "easeOut" }}
            />
          )}
          {/* 떨림 — 칭호 직전 그릇이 부르르 (가챠 긴장감) */}
          <m.div
            animate={live ? { rotate: [0, -2.5, 2.5, -2.5, 2.5, -1.2, 1.2, 0] } : { rotate: 0 }}
            transition={live ? { delay: T.title - 0.6, duration: 0.55, ease: "easeInOut" } : { duration: 0 }}
          >
            <VesselCharacter code={vessel.code} size={175} />
          </m.div>
        </m.div>

        <RarityBadge per100={vessel.per100} reveal={live} />
        <TitleReveal name={vessel.name} tagline={vessel.tagline} reveal={live} />

        <m.p
          initial={live ? { opacity: 0, y: 12 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: live ? T.fact : 0, ease: [0.23, 1, 0.32, 1] }}
          className="card mt-5 w-full px-5 py-4 text-[15px] leading-relaxed font-medium"
        >
          “{vessel.fact}”
        </m.p>
      </div>

      {/* ── 본문 섹션 (리빌 종료 후) ── */}
      <m.div
        initial={{ opacity: 0 }}
        animate={{ opacity: ready ? 1 : 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <Section title="이 그릇의 강점">
          <ul className="space-y-2">
            {vessel.strengths.map((s) => (
              <li key={s} className="flex gap-2 text-[15px] leading-relaxed">
                <span style={{ color: "var(--gold-deep)" }}>◆</span>
                <span>{s}</span>
              </li>
            ))}
          </ul>
        </Section>

        <Section title="이것만 기억하세요">
          <p className="text-[15px] leading-relaxed">{vessel.caution}</p>
        </Section>

        <Section title="금전 궁합">
          <div className="flex gap-3">
            <MatchCard label="돈이 통하는 그릇" code={vessel.matchGood} good />
            <MatchCard label="돈 얘기 스타일 정반대" code={vessel.matchBad} />
          </div>
          <p className="mt-3 text-[13px]" style={{ color: "var(--ink-faint)" }}>
            스타일이 정반대인 그릇, 주변에 떠오르는 사람 있죠?
          </p>
          {isOwner && <VsChallengeButton vessel={vessel} />}
        </Section>

        {/* 잠긴 상세 — 질문형 헤더 + 숨쉬는 자물쇠 (패널 채택 4) */}
        <Section title="상세 풀이">
          <div className="space-y-3">
            <LockedRow title="돈이 들어오는 달은 언제?" preview="당신의 그릇이 가장 크게 열리는 달은 " />
            <LockedRow title="그릇이 넘치는 시기는?" preview="대운의 흐름상 물이 차오르는 시기는 " />
            <LockedRow title="이 그릇, 새는 구멍은 어디?" preview="물이 새는 방향과 막는 법은 " />
          </div>
          {isOwner ? (
            <Link
              href="/p"
              className="mt-3 block rounded-xl border-[1.5px] px-4 py-3 text-center text-[15px] font-bold transition-transform active:scale-[0.97]"
              style={{ borderColor: "var(--gold)", color: "var(--gold-deep)", background: "var(--card)" }}
            >
              상세 풀이 열어보기 — 990원
            </Link>
          ) : (
            <p className="mt-3 text-center text-[13px]" style={{ color: "var(--ink-faint)" }}>
              당신 사주로만 생성되는 세상에 1개짜리 풀이 · 990원
            </p>
          )}
        </Section>

        <ComboSection vessel={vessel} initialMbti={initialMbti} />

        {/* CTA — 화면당 주 버튼 1개 */}
        {isOwner ? <ShareButton vessel={vessel} /> : (
          <Link href="/input" className="btn-primary mt-8">
            나도 무료로 내 그릇 확인
          </Link>
        )}

        <div className="mt-5 flex justify-center gap-5 text-[13px]" style={{ color: "var(--ink-soft)" }}>
          {isOwner && (
            <Link href="/today" className="underline underline-offset-2">오늘의 재물운</Link>
          )}
          <Link href="/types" className="underline underline-offset-2">16가지 그릇 도감</Link>
        </div>
      </m.div>
    </div>
    </LazyMotion>
  );
}

/* ── 명식 미니표 (소유자 전용 — 공유 화면엔 절대 미노출) ── */
function PillarStrip({ saju, reveal }: { saju: SajuResult; reveal: boolean }) {
  const order = ["hour", "day", "month", "year"] as const;
  const labels: Record<(typeof order)[number], string> = { hour: "시", day: "일", month: "월", year: "년" };
  const chars = order.flatMap((p) => {
    const d = saju.pillarDetails[p];
    return [
      { ch: d.stem, ko: d.stemKo, el: d.element.stem, key: `${p}-s`, label: labels[p] },
      { ch: d.branch, ko: d.branchKo, el: d.element.branch, key: `${p}-b`, label: "" },
    ];
  });
  return (
    <div className="flex gap-1.5" aria-label="사주 명식">
      {chars.map((c, i) => (
        <m.div
          key={c.key}
          initial={reveal ? { opacity: 0, y: -8 } : false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: reveal ? T.pillars + i * 0.07 : 0, ease: "easeOut" }}
          className="flex h-11 w-9 flex-col items-center justify-center rounded-lg text-[15px] font-bold text-white"
          style={{ background: EL_COLOR[c.el] ?? "var(--ink-faint)" }}
          title={c.ko}
        >
          {c.ch}
        </m.div>
      ))}
    </div>
  );
}

function RarityBadge({ per100, reveal }: { per100: number; reveal: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  // rAF 카운트업 — 모션 엔진 없이 숫자만 갱신 (고정폭 숫자로 리플로우 차단)
  useEffect(() => {
    if (!reveal || !ref.current) return;
    const start = Math.min(per100 * 5, 99);
    const t0 = performance.now() + T.percent * 1000;
    const ease = (t: number) => 1 - Math.pow(1 - t, 4);
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(Math.max((now - t0) / 900, 0), 1);
      if (ref.current) ref.current.textContent = String(Math.round(start + (per100 - start) * ease(p)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [per100, reveal]);
  return (
    <m.p
      initial={reveal ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: reveal ? T.percent : 0 }}
      className="mt-4 text-[15px] font-semibold"
      style={{ color: "var(--gold-deep)" }}
    >
      이 그릇, 100명 중{" "}
      <span
        ref={ref}
        className="inline-block text-center text-[19px] font-extrabold"
        style={{ fontVariantNumeric: "tabular-nums", minWidth: "2ch" }}
      >
        {per100}
      </span>
      명
      <span className="mt-0.5 block text-[11px] font-normal" style={{ color: "var(--ink-faint)" }}>
        실제 만세력 계산 · 희귀도는 8만 사주 분포 실측값
      </span>
    </m.p>
  );
}

function TitleReveal({ name, tagline, reveal }: { name: string; tagline: string; reveal: boolean }) {
  return (
    <div className="mt-1">
      <h1 className="text-[34px] font-extrabold tracking-tight" style={{ fontFamily: "var(--font-display)" }} aria-label={name}>
        {name.split("").map((ch, i) => (
          <m.span
            key={i}
            className="inline-block"
            initial={reveal ? { opacity: 0, y: 18, rotate: -4 } : false}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            transition={{ duration: 0.35, delay: reveal ? T.title + i * 0.06 : 0, ease: [0.23, 1, 0.32, 1] }}
          >
            {ch}
          </m.span>
        ))}
      </h1>
      <m.p
        initial={reveal ? { opacity: 0 } : false}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: reveal ? T.title + 0.4 : 0 }}
        className="mt-1 text-[15px] font-medium"
        style={{ color: "var(--ink-soft)" }}
      >
        {tagline}
      </m.p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[13px] font-bold tracking-wider" style={{ color: "var(--ink-faint)" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function MatchCard({ label, code, good }: { label: string; code: keyof typeof VESSEL_TYPES; good?: boolean }) {
  const v = VESSEL_TYPES[code];
  return (
    <div className="card flex-1 px-4 py-3">
      <p className="text-[11px] font-semibold" style={{ color: good ? "var(--gold-deep)" : "var(--ink-faint)" }}>{label}</p>
      <p className="mt-1 text-[16px] font-bold">{v.name}</p>
    </div>
  );
}

function LockedRow({ title, preview }: { title: string; preview: string }) {
  return (
    <div className="card relative overflow-hidden px-5 py-4">
      <p className="text-[15px] font-bold">{title}</p>
      <p className="mt-1 select-none text-[14px]" style={{ color: "var(--ink-soft)" }}>
        {preview}
        <span aria-hidden className="align-middle blur-[5px]">2●2●년 ●월과 ●월, 그리고</span>
      </p>
      <span className="lock-breathe absolute right-4 top-1/2 text-[18px]" aria-label="잠김">🔒</span>
    </div>
  );
}

/* ── 친구 대결 걸기 (K-factor 루프: 받은 사람이 입력해야 결과가 나옴) ── */
function VsChallengeButton({ vessel }: { vessel: VesselType }) {
  const [copied, setCopied] = useState(false);
  async function onChallenge() {
    track("share_click", { kind: "vs" });
    const url = `${location.origin}/vs/${vessel.slug}?from=vs`;
    const text = `내 재물그릇은 ${vessel.name}. 네 그릇이랑 대결 붙어보자 — 생년월일만 넣으면 10초면 나와`;
    if (navigator.share) {
      try { await navigator.share({ title: "그릇 대결", text, url }); return; } catch { /* 취소 */ }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      onClick={onChallenge}
      className="mt-3 w-full rounded-xl border-[1.5px] px-4 py-3 text-[15px] font-bold transition-transform active:scale-[0.97]"
      style={{ borderColor: "var(--gold)", color: "var(--gold-deep)", background: "var(--card)" }}
    >
      {copied ? "대결 링크 복사 완료" : "친구에게 그릇 대결 걸기"}
    </button>
  );
}

/* ── 성격 조합 카드 — "MBTI" 문자열 미노출(상표), 유저 입력 4글자만 표기 ── */
function ComboSection({ vessel, initialMbti }: { vessel: VesselType; initialMbti?: string | null }) {
  const preset = initialMbti ? normalizeMbti(initialMbti) : null;
  const [axes, setAxes] = useState<Record<number, string>>(
    preset ? { 0: preset[0], 1: preset[1], 2: preset[2], 3: preset[3] } : {}
  );
  const [copied, setCopied] = useState(false);
  const pairs: [string, string][] = [["E", "I"], ["N", "S"], ["T", "F"], ["J", "P"]];
  const mbti = [0, 1, 2, 3].map((i) => axes[i] ?? "").join("");
  const complete = mbti.length === 4;
  const combo = complete ? comboFact(vessel, mbti) : null;

  async function onShareCombo() {
    if (!combo) return;
    track("share_click", { kind: "combo" });
    const url = `${location.origin}/r/${vessel.slug}/c/${mbti}?from=share`;
    const text = `나는 ${combo.title} — 이 조합, 흔치 않대요. 너는 무슨 조합이야?`;
    if (navigator.share) {
      try { await navigator.share({ title: "재물그릇 조합", text, url }); return; } catch { /* 취소 */ }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Section title="성격 조합 카드">
      <p className="mb-3 text-[14px]" style={{ color: "var(--ink-soft)" }}>
        성격유형 4글자 아시죠? 그릇이랑 섞으면 조합이 나와요
      </p>
      <div className="space-y-2">
        {pairs.map((pair, i) => (
          <div className="seg" key={i} role="radiogroup" aria-label={`${pair[0]} 또는 ${pair[1]}`}>
            {pair.map((letter) => (
              <button
                key={letter}
                data-on={axes[i] === letter}
                onClick={() => setAxes((prev) => ({ ...prev, [i]: letter }))}
              >
                {letter}
              </button>
            ))}
          </div>
        ))}
      </div>
      {combo && (
        <m.div
          initial={{ opacity: 0, y: 14, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
          className="card mt-4 px-5 py-5"
          style={{ background: "var(--gold-soft)", borderColor: "#eeddc2" }}
        >
          <p className="text-[19px] font-extrabold">{combo.title}</p>
          <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
            {combo.body}
          </p>
          <button
            onClick={onShareCombo}
            className="mt-4 w-full rounded-xl border-[1.5px] px-4 py-3 text-[15px] font-bold transition-transform active:scale-[0.97]"
            style={{ borderColor: "var(--gold)", color: "var(--gold-deep)", background: "var(--card)" }}
          >
            {copied ? "복사했어요 — 붙여넣기만 하세요" : "조합 카드 공유하기"}
          </button>
        </m.div>
      )}
    </Section>
  );
}

function ShareButton({ vessel }: { vessel: VesselType }) {
  const [copied, setCopied] = useState(false);
  async function onShare() {
    track("share_click", { kind: "card" });
    const url = `${location.origin}/r/${vessel.slug}?from=share`;
    const text = `내 재물그릇은 ${vessel.name} — "${vessel.tagline}" 100명 중 ${vessel.per100}명만 나온대요. 너도 확인해봐`;
    if (navigator.share) {
      try { await navigator.share({ title: "재물그릇", text, url }); return; } catch { /* 취소 */ }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button className="btn-primary mt-8" onClick={onShare}>
      {copied ? "복사했어요 — 붙여넣기만 하세요" : "내 그릇 자랑하기"}
    </button>
  );
}
