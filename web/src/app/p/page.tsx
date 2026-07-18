"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadResult, type StoredResult } from "@/lib/result-store";
import { loadReceipt, PRICE_KRW } from "@/lib/pay";
import { vesselBySlug, type VesselType } from "@/lib/vessel-types";
import { VesselCharacter } from "@/components/VesselCharacter";
import { track } from "@/lib/track";
import type { Reading } from "@/lib/reading";

/**
 * 유료 상세 풀이 페이지 (M2)
 * - 본인 기기(localStorage 재생성 코드)로만 진입 — URL에 생년월일 없음
 * - M3에서 결제 unlock이 이 앞단에 붙는다. 그 전까지는 ?dev=1로만 생성 가능
 * - 결제 후 대기 연출: 주어는 항상 "그릇·가마·금빛" (보이스 바이블 §4)
 */

const KILN_LINES = [
  "그릇을 가마에 다시 넣는 중…",
  "대운의 결을 따라 유약을 입히는 중…",
  "열두 달의 문양을 새기는 중…",
  "금빛이 스며들 자리를 살피는 중…",
];

export default function PaidReadingPage() {
  // error = 이 기기에 그릇 결과 없음 / fail = 결과는 있는데 생성 실패(재시도 가능)
  const [state, setState] = useState<"gate" | "loading" | "done" | "error" | "fail">("gate");
  const [reading, setReading] = useState<Reading | null>(null);
  const [vessel, setVessel] = useState<VesselType | null>(null);
  const [mode, setMode] = useState<string>("");
  const [kilnLine, setKilnLine] = useState(0);
  const started = useRef(false);
  const inputRef = useRef<StoredResult["input"] | null>(null);

  function generate() {
    if (!inputRef.current) return;
    setState("loading");
    fetch("/api/reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: inputRef.current }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("failed");
        const data = (await r.json()) as { reading: Reading; vessel: string; mode: string };
        setReading(data.reading);
        setMode(data.mode);
        setVessel(vesselBySlug(data.vessel));
        setState("done");
        track("paid_view", { mode: data.mode });
      })
      .catch(() => setState("fail"));
  }

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const stored = loadResult();
    if (!stored) {
      setState("error");
      return;
    }
    setVessel(vesselBySlug(stored.slug));
    inputRef.current = stored.input;
    // 잠금 해제: 결제 영수증(이 기기) 또는 개발용 ?dev=1
    const dev = new URLSearchParams(location.search).get("dev") === "1";
    const paid = loadReceipt() !== null;
    if (!dev && !paid) {
      setState("gate");
      return;
    }
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 가마 로딩 문구 순환
  useEffect(() => {
    if (state !== "loading") return;
    const t = setInterval(() => setKilnLine((v) => (v + 1) % KILN_LINES.length), 2200);
    return () => clearInterval(t);
  }, [state]);

  if (state === "gate") {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        {vessel && <VesselCharacter code={vessel.code} size={120} />}
        <h1 className="mt-4 text-[22px] font-extrabold">상세 풀이 열기</h1>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          돈이 들어오는 달, 그릇이 넘치는 시기, 조심할 지출 구멍 —
          <br />
          당신 사주로만 계산해서 지금 바로 구워드려요.
        </p>
        <Link href="/pay" className="btn-primary mt-8">
          {PRICE_KRW.toLocaleString()}원으로 열기
        </Link>
        <Link
          href={vessel ? `/r/${vessel.slug}` : "/input"}
          className="mt-4 text-[13px] underline underline-offset-2"
          style={{ color: "var(--ink-soft)" }}
        >
          내 그릇으로 돌아가기
        </Link>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[20px] font-extrabold">그릇을 먼저 꺼내야 해요</h1>
        <p className="mt-2 text-[14px]" style={{ color: "var(--ink-soft)" }}>
          이 기기에서 만든 그릇 결과가 없어요.
        </p>
        <Link href="/input" className="btn-primary mt-8">무료로 내 그릇 확인</Link>
      </div>
    );
  }

  if (state === "fail") {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        {vessel && <VesselCharacter code={vessel.code} size={110} />}
        <h1 className="mt-4 text-[20px] font-extrabold">풀이를 굽다가 멈췄어요</h1>
        <p className="mt-2 text-[14px]" style={{ color: "var(--ink-soft)" }}>
          가마가 잠깐 흔들렸어요. 다시 시도하면 대부분 해결돼요.
        </p>
        <button className="btn-primary mt-8" onClick={generate}>다시 시도</button>
        {vessel && (
          <Link href={`/r/${vessel.slug}`} className="mt-4 text-[13px] underline underline-offset-2" style={{ color: "var(--ink-soft)" }}>
            내 그릇으로 돌아가기
          </Link>
        )}
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        <div className="float-bob">
          {vessel && <VesselCharacter code={vessel.code} size={130} />}
        </div>
        <p
          key={kilnLine}
          className="fade-in-up mt-5 text-[15px] font-semibold"
          style={{ color: "var(--gold-deep)" }}
        >
          {KILN_LINES[kilnLine]}
        </p>
        <p className="mt-2 text-[12px]" style={{ color: "var(--ink-faint)" }}>
          당신 사주로만 굽는 풀이라 조금 걸려요 (10~30초)
        </p>
      </div>
    );
  }

  if (!reading || !vessel) return null;

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="flex flex-col items-center text-center">
        <VesselCharacter code={vessel.code} size={110} />
        <p className="mt-2 text-[13px] font-semibold tracking-wide" style={{ color: "var(--gold-deep)" }}>
          {vessel.name} 상세 풀이
        </p>
        <p className="card mt-3 w-full px-5 py-4 text-[15px] font-medium leading-relaxed">{reading.summary}</p>
        {mode === "mock" && (
          <p className="mt-2 text-[11px]" style={{ color: "var(--ink-faint)" }}>
            샘플 모드 — API 키 연결 시 실제 풀이가 생성됩니다
          </p>
        )}
      </div>

      <PaidSection title="당신의 재물 구조">{reading.structure}</PaidSection>
      <PaidSection title="대운으로 보는 큰 흐름">{reading.flow}</PaidSection>

      {/* 롤링 12칸 캘린더 — 결제한 달부터 앞으로 12개월, 숫자는 전부 엔진 계산값 */}
      <section className="mt-8">
        <h2 className="mb-1 text-[13px] font-bold tracking-wider" style={{ color: "var(--ink-faint)" }}>
          돈이 들어오는 달 — 앞으로 12개월
        </h2>
        <p className="mb-3 text-[11px]" style={{ color: "var(--ink-faint)" }}>
          <span style={{ color: "var(--gold)" }}>■</span> 움직이는 달 ·{" "}
          <span style={{ color: "var(--gold-soft)" }}>■</span> 다지는 달 ·{" "}
          <span style={{ color: "#f1ece4" }}>■</span> 잠그는 달
        </p>
        <div className="grid grid-cols-4 gap-1.5">
          {reading.months.map((m) => (
            <div
              key={`${m.year}-${m.month}`}
              className="flex flex-col items-center rounded-lg px-1 py-2"
              style={{
                background: m.level === 3 ? "var(--gold)" : m.level === 2 ? "var(--gold-soft)" : "#f1ece4",
                color: m.level === 3 ? "#fff" : "var(--ink)",
              }}
              title={m.note}
            >
              <span className="text-[13px] font-extrabold">{m.month}월{m.month === 1 ? `(${String(m.year).slice(2)})` : ""}</span>
              <span className="mt-0.5 text-[9.5px] leading-tight">{m.label}</span>
              <span className="text-[8.5px] leading-tight opacity-60">{m.ganzhi}</span>
            </div>
          ))}
        </div>
        <ul className="mt-3 space-y-1.5">
          {reading.months.filter((m) => m.level === 3).map((m) => (
            <li key={`${m.year}-${m.month}`} className="text-[14px]">
              <b style={{ color: "var(--gold-deep)" }}>{m.year !== reading.months[0].year ? `${String(m.year).slice(2)}년 ` : ""}{m.month}월</b> — {m.note}
              <span className="ml-1 text-[11px]" style={{ color: "var(--ink-faint)" }}>({m.ganzhi})</span>
            </li>
          ))}
        </ul>
        <TeaserShareButton vessel={vessel} months={reading.months} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-[13px] font-bold tracking-wider" style={{ color: "var(--ink-faint)" }}>
          다음 행동 3가지
        </h2>
        <ol className="space-y-2">
          {reading.actions.map((a, i) => (
            <li key={i} className="card flex gap-3 px-4 py-3 text-[15px] leading-relaxed">
              <span className="font-extrabold" style={{ color: "var(--gold-deep)" }}>{i + 1}</span>
              <span>{a}</span>
            </li>
          ))}
        </ol>
      </section>

      <PaidSection title="조심할 지출 구멍">{reading.caution}</PaidSection>

      <p className="mt-8 text-center text-[12px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
        이 풀이는 당신 사주로만 생성된 세상에 1개짜리예요.
        <br />
        링크를 저장해 두면 언제든 다시 볼 수 있어요.
      </p>
      <Link href={`/r/${vessel.slug}`} className="btn-primary mt-6">내 그릇 카드로 돌아가기</Link>
    </div>
  );
}

/* 자랑 카드 — 결제자가 마케터가 되는 루프. 공유 URL엔 유형+달 숫자만 (절대규칙 5) */
function TeaserShareButton({ vessel, months }: { vessel: VesselType; months: Reading["months"] }) {
  const [copied, setCopied] = useState(false);
  const best = months.find((m) => m.level === 3) ?? months[0];
  async function onShare() {
    track("share_click", { kind: "paidshare" });
    const url = `${location.origin}/t/${vessel.slug}/${best.month}?from=paidshare`;
    const text = `내 돈길 열리는 달은 ${best.month}월 — 네 달은 언제야?`;
    if (navigator.share) {
      try { await navigator.share({ title: "돈길 열리는 달", text, url }); return; } catch { /* 취소 */ }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <button
      onClick={onShare}
      className="mt-4 w-full rounded-xl border-[1.5px] px-4 py-3 text-[15px] font-bold transition-transform active:scale-[0.97]"
      style={{ borderColor: "var(--gold)", color: "var(--gold-deep)", background: "var(--card)" }}
    >
      {copied ? "자랑 링크 복사 완료" : `"내 돈길 달은 ${best.month}월" 자랑하기`}
    </button>
  );
}

function PaidSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-[13px] font-bold tracking-wider" style={{ color: "var(--ink-faint)" }}>
        {title}
      </h2>
      <p className="whitespace-pre-line text-[15px] leading-relaxed">{children}</p>
    </section>
  );
}
