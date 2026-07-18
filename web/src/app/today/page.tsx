"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { loadResult } from "@/lib/result-store";
import { vesselBySlug, type VesselType } from "@/lib/vessel-types";
import { VesselCharacter } from "@/components/VesselCharacter";
import { track } from "@/lib/track";
import type { DailyFortune } from "@/lib/daily";

/**
 * 오늘의 재물운 (M4 — 무료·엔진 계산·LLM 미사용)
 * 매일 바뀌는 재방문 훅. 결과가 있는 기기는 바로 보여주고,
 * 없는 기기(공유로 유입)는 무료 입력으로 보낸다.
 */

const LEVEL_STYLE: Record<number, { bg: string; fg: string }> = {
  3: { bg: "var(--gold)", fg: "#fff" },
  2: { bg: "var(--gold-soft)", fg: "var(--gold-deep)" },
  1: { bg: "#f1ece4", fg: "var(--ink-soft)" },
};

export default function TodayPage() {
  const [state, setState] = useState<"loading" | "none" | "done">("loading");
  const [fortune, setFortune] = useState<DailyFortune | null>(null);
  const [vessel, setVessel] = useState<VesselType | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = loadResult();
    if (!stored) { setState("none"); return; }
    setVessel(vesselBySlug(stored.slug));
    // 만세력 엔진은 이 페이지 진입 시에만 로드 (랜딩 LCP 보호)
    import("@/lib/daily").then(({ dailyFortune }) => {
      setFortune(dailyFortune(stored.input, new Date()));
      setState("done");
      track("daily_view");
    });
  }, []);

  async function onShare() {
    if (!fortune) return;
    track("share_click", { kind: "daily" });
    const url = `${location.origin}/today?from=daily`;
    const text = `오늘 내 재물운: ${fortune.levelName} — 너는 어떤 날인지 확인해봐`;
    if (navigator.share) {
      try { await navigator.share({ title: "오늘의 재물운", text, url }); return; } catch { /* 취소 */ }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  // 첫 페인트 확보 — JS·계산이 끝나기 전에도 타이틀+스켈레톤이 보인다
  if (state === "loading") {
    return (
      <div className="px-5 pt-10 pb-8">
        <div className="flex flex-col items-center text-center">
          <p className="text-[13px] font-bold tracking-[0.3em]" style={{ color: "var(--gold-deep)" }}>
            오늘의 재물운
          </p>
          <div className="skeleton mt-6 h-[120px] w-[120px] rounded-full" />
          <div className="skeleton mt-5 h-[38px] w-[160px] rounded-full" />
          <div className="skeleton mt-4 h-[84px] w-full" />
          <div className="skeleton mt-3 h-[52px] w-full" />
        </div>
      </div>
    );
  }

  if (state === "none") {
    return (
      <div className="flex min-h-[80dvh] flex-col items-center justify-center px-6 text-center">
        <p className="text-[13px] font-bold tracking-[0.3em]" style={{ color: "var(--gold-deep)" }}>
          오늘의 재물운
        </p>
        <h1 className="mt-3 text-[24px] font-extrabold leading-snug">
          내 그릇을 먼저 꺼내면
          <br />
          매일의 돈 기운을 알려드려요
        </h1>
        <p className="mt-3 text-[14px]" style={{ color: "var(--ink-soft)" }}>
          무료 · 10초 · 생년월일은 저장하지 않아요
        </p>
        <Link href="/input" className="btn-primary mt-8">무료로 내 그릇 확인</Link>
      </div>
    );
  }

  if (!fortune) return null;
  const style = LEVEL_STYLE[fortune.level];

  return (
    <div className="px-5 pt-10 pb-8">
      <div className="flex flex-col items-center text-center">
        <p className="text-[13px] font-bold tracking-[0.3em]" style={{ color: "var(--gold-deep)" }}>
          오늘의 재물운
        </p>
        <p className="mt-1 text-[13px]" style={{ color: "var(--ink-faint)" }}>
          {fortune.month}월 {fortune.day}일 · {fortune.ganzhi}일
        </p>

        {vessel && (
          <div className="fade-in-up mt-5">
            <VesselCharacter code={vessel.code} size={120} />
          </div>
        )}

        <div
          className="fade-in-up mt-4 rounded-full px-5 py-2 text-[16px] font-extrabold"
          style={{ background: style.bg, color: style.fg, animationDelay: "0.12s" }}
        >
          {fortune.levelName}
        </div>

        <p className="mt-2 text-[14px] font-semibold" style={{ color: "var(--gold-deep)" }}>
          오늘의 기운: {fortune.label}
        </p>

        <p
          className="fade-in-up card mt-4 w-full px-5 py-4 text-[15px] leading-relaxed"
          style={{ animationDelay: "0.24s" }}
        >
          {fortune.message}
        </p>

        <div className="card mt-3 flex w-full gap-3 px-5 py-4 text-left">
          <span className="text-[15px] font-extrabold" style={{ color: "var(--gold-deep)" }}>오늘 할 일</span>
          <span className="text-[15px] leading-relaxed">{fortune.tip}</span>
        </div>

        {fortune.nextGoodInDays !== null && (
          <p className="mt-4 text-[13px]" style={{ color: "var(--ink-soft)" }}>
            다음 <b style={{ color: "var(--gold-deep)" }}>돈길 열리는 날</b>은{" "}
            {fortune.nextGoodInDays === 1 ? "바로 내일이에요" : `${fortune.nextGoodInDays}일 뒤예요`} — 내일 또 확인해 보세요
          </p>
        )}

        <button className="btn-primary mt-7" onClick={onShare}>
          {copied ? "복사했어요 — 붙여넣기만 하세요" : "오늘 운세 공유하기"}
        </button>
        {vessel && (
          <Link href={`/r/${vessel.slug}`} className="mt-4 text-[13px] underline underline-offset-2" style={{ color: "var(--ink-soft)" }}>
            내 그릇 카드로 돌아가기
          </Link>
        )}
      </div>
    </div>
  );
}
