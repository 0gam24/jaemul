"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadResult, type StoredResult } from "@/lib/result-store";
import { clearReceipt, loadReceipt, PRICE_KRW } from "@/lib/pay";
import { VESSEL_TYPES, vesselBySlug, type VesselType } from "@/lib/vessel-types";
import { SYNERGY_COPY } from "@/lib/synergy";
import { vsVerdict } from "@/lib/combo";
import { PremiumVessel } from "@/components/PremiumVessel";
import { shareToKakao } from "@/lib/kakao";
import { track } from "@/lib/track";
import { getTurnstileToken } from "@/lib/turnstile";
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
  const [elements, setElements] = useState<Record<string, number> | null>(null);
  const [kilnLine, setKilnLine] = useState(0);
  const started = useRef(false);
  const inputRef = useRef<StoredResult["input"] | null>(null);
  // 열람 자격 증명 — 실제 판정은 서버가 KV 영수증·토스 조회로 한다 (여기 값은 '내 주문번호' 메모)
  const orderIdRef = useRef<string | null>(null);

  async function generate() {
    if (!inputRef.current) return;
    setState("loading");
    // 봇 방어 토큰 (Invisible — 사용자에겐 보이지 않음). 키 미설정 시 null → 서버도 스킵
    const turnstileToken = await getTurnstileToken();
    fetch("/api/reading", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input: inputRef.current, orderId: orderIdRef.current, turnstileToken }),
    })
      .then(async (r) => {
        if (r.status === 402) {
          // 서버가 이 주문번호를 부인 — 영수증이 낡았거나 위조. 재시도 루프 대신
          // 영수증을 버리고 결제 화면으로 되돌린다 (진짜 결제자는 confirm이 KV에 새로 기록)
          clearReceipt();
          orderIdRef.current = null;
          track("paid_view", { mode: "stale_receipt" });
          setState("gate");
          return;
        }
        if (!r.ok) throw new Error("failed");
        const data = (await r.json()) as { reading: Reading; vessel: string; mode: string; elements?: Record<string, number> };
        setReading(data.reading);
        setMode(data.mode);
        setElements(data.elements ?? null);
        setVessel(vesselBySlug(data.vessel));
        setState("done");
        navigator.vibrate?.(15); // 가마 문 열림 — 무료 리빌과 같은 햅틱 문법
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
    // 결제 안내 화면을 띄울지 말지만 정한다. 진짜 열람 자격은 서버가 판단하므로
    // ?dev=1로 여기를 건너뛰어도 로컬에 DEV_UNLOCK_READING=1이 없으면 402로 막힌다.
    const dev = new URLSearchParams(location.search).get("dev") === "1";
    const receipt = loadReceipt();
    orderIdRef.current = receipt?.orderId ?? null;
    if (!dev && !receipt) {
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
    // 결제 직전 화면 = 세일즈 화면. 받을 것의 구성·가격 앵커·안심 신호를 의사결정 지점에 집결한다.
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 py-10 text-center">
        {vessel && <PremiumVessel code={vessel.code} size={110} />}
        <h1 className="mt-4 text-[22px] font-extrabold">상세 풀이 열기</h1>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          당신 사주로만 계산해서 지금 바로 구워드려요.
        </p>
        <ul className="card mt-5 w-full space-y-2.5 px-5 py-4 text-left text-[14px] leading-relaxed">
          <li className="flex gap-2"><span style={{ color: "var(--gold-deep)" }}>◆</span><span><b>돈이 들어오는 달</b> — 앞으로 12개월 캘린더</span></li>
          <li className="flex gap-2"><span style={{ color: "var(--gold-deep)" }}>◆</span><span><b>재물 구조 심층 풀이</b> — 무료 카드가 나온 계산 근거</span></li>
          <li className="flex gap-2"><span style={{ color: "var(--gold-deep)" }}>◆</span><span><b>대운 10년 흐름</b> — 지난 10년 회고 + 다가올 방향</span></li>
          <li className="flex gap-2"><span style={{ color: "var(--gold-deep)" }}>◆</span><span><b>다음 행동 3가지 + 지출 구멍</b> — 내 사주 전용 처방</span></li>
        </ul>
        <p className="mt-4 text-[13px]" style={{ color: "var(--ink-soft)" }}>
          철학관에서 20만원 주고 묻는 것 — 여기선 <b style={{ color: "var(--ink)" }}>{PRICE_KRW.toLocaleString()}원</b>
        </p>
        <Link href="/pay" className="btn-primary mt-5">
          {PRICE_KRW.toLocaleString()}원으로 열기
        </Link>
        <p className="mt-3 text-[12px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
          결제 후 1~2분 정성껏 생성 · 실패 시 추가 결제 없이 다시 시도
        </p>
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
        {vessel && <PremiumVessel code={vessel.code} size={110} />}
        <h1 className="mt-4 text-[20px] font-extrabold">풀이를 굽다가 멈췄어요</h1>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
          가마가 잠깐 흔들렸어요. 다시 시도하면 대부분 해결돼요.
          <br />
          결제는 안전하게 확인돼 있어요 — 몇 번을 다시 구워도 추가 결제는 없어요.
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
    // 결제 직후 대기(10~30초) = 기대감 구간. 가마에서 그릇이 달궈지는 영상을 재생해
    // "장인이 굽는 시간"을 화면으로 보여준다. 영상 로드 전·실패 시엔 poster(캐릭터)가 뜬다.
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        <video
          src="/premium/kiln-loading.mp4"
          poster={vessel ? `/premium/${vessel.slug}.png` : undefined}
          autoPlay
          muted
          loop
          playsInline
          className="w-[230px] rounded-3xl shadow-lg"
          aria-label="풀이를 굽는 중"
        />
        <p
          key={kilnLine}
          className="fade-in-up mt-5 text-[15px] font-semibold"
          style={{ color: "var(--gold-deep)" }}
        >
          {KILN_LINES[kilnLine]}
        </p>
        <p className="mt-2 text-[12px]" style={{ color: "var(--ink-faint)" }}>
          당신 사주로만 굽는 풀이라 조금 걸려요 (1~2분)
        </p>
      </div>
    );
  }

  if (!reading || !vessel) return null;

  // 언박싱 시퀀스 — 전체 덤프 대신 요약(펀치라인)부터 섹션이 순차 등장한다.
  // 캐시 재열람도 동일 연출이지만 0.9초 안에 끝나므로 재방문 마찰은 없다.
  const stagger = (i: number): React.CSSProperties => ({
    animationDelay: `${i * 0.15}s`,
    animationFillMode: "backwards",
  });

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="fade-in-up flex flex-col items-center text-center" style={stagger(0)}>
        <PremiumVessel code={vessel.code} size={110} />
        <p className="mt-2 text-[13px] font-semibold tracking-wide" style={{ color: "var(--gold-deep)" }}>
          {vessel.name} 상세 풀이
        </p>
        <DdayChip months={reading.months} />
        <p className="card mt-3 w-full px-5 py-4 text-[15px] font-medium leading-relaxed">{reading.summary}</p>
        {reading.shareLine && <ShareLineCard vessel={vessel} shareLine={reading.shareLine} months={reading.months} />}
        {mode === "mock" && (
          <p className="mt-2 text-[11px]" style={{ color: "var(--ink-faint)" }}>
            샘플 모드 — API 키 연결 시 실제 풀이가 생성됩니다
          </p>
        )}
      </div>

      <section className="fade-in-up mt-8" style={stagger(1)}>
        <h2 className="mb-3 text-[13px] font-bold tracking-wider" style={{ color: "var(--ink-faint)" }}>
          내 그릇의 구조 — 들어오는 길과 새는 구멍
        </h2>
        {elements && <ElementBars elements={elements} />}
        <p className="whitespace-pre-line text-[15px] leading-relaxed">{reading.structure}</p>
      </section>

      {/* v1 캐시 호환 — 새 생성분은 새는 구멍이 structure에 흡수되어 이 섹션이 없다 */}
      {reading.caution && (
        <div className="fade-in-up" style={stagger(2)}>
          <PaidSection title="조심할 지출 구멍">{reading.caution}</PaidSection>
        </div>
      )}

      {/* 돈의 달력 — 대운 위치 안내문(flow)이 캘린더 바로 위에 얹힌다 */}
      <section className="fade-in-up mt-8" style={stagger(3)}>
        <h2 className="mb-1 text-[13px] font-bold tracking-wider" style={{ color: "var(--ink-faint)" }}>
          돈의 달력 — 지금 10년과 앞으로 12개월
        </h2>
        <p className="mb-4 whitespace-pre-line text-[15px] leading-relaxed">{reading.flow}</p>
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

      <section className="fade-in-up mt-8" style={stagger(4)}>
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

      <div className="fade-in-up" style={stagger(5)}>
        <SynergySection vessel={vessel} reading={reading} />
      </div>

      <PaidFinale vessel={vessel} reading={reading} />
    </div>
  );
}

/* 피날레 = 반쪽 궁합 카드. 풀이를 다 읽은 직후가 감정 최고점 — 여기서 이탈(돌아가기)이
   아니라 '상대 소환'으로 내보낸다. 미완성(빈칸) 카드는 받은 사람만 채울 수 있다. */
function PaidFinale({ vessel, reading }: { vessel: VesselType; reading: Reading }) {
  const [copied, setCopied] = useState(false);
  const best = reading.months.find((m) => m.level === 3) ?? reading.months[0];
  const hook = reading.shareLine ?? `내 돈길 열리는 달은 ${best.month}월`;

  async function onAsk() {
    track("share_click", { kind: "finale_ask" });
    const url = `${location.origin}/vs/${vessel.slug}?from=finale`;
    if (
      await shareToKakao({
        title: `나 ${vessel.name}(100명 중 ${vessel.per100}명)이래 — 너는 무슨 그릇이야?`,
        description: `나랑 돈이 통하는 그릇이 따로 있대. 생년월일만 넣으면 무료로 나와`,
        imageUrl: `${location.origin}/api/og/${vessel.slug}?vs=1&v=2`,
        url,
        buttons: [{ title: "내 그릇 확인하기 (무료)", url }],
      })
    ) return;
    if (navigator.share) {
      try { await navigator.share({ title: "재물그릇", text: `나 ${vessel.name}이래 — 너는 무슨 그릇이야?`, url }); return; } catch { /* 취소 */ }
    }
    await copyLink(`나 ${vessel.name}이래 — 너는 무슨 그릇이야?`, url);
  }

  async function onKakao() {
    track("share_click", { kind: "paid_finale" });
    const url = `${location.origin}/t/${vessel.slug}/${best.month}?from=finale`;
    if (
      await shareToKakao({
        title: `"${hook}"`,
        description: `${vessel.name} 사주 풀이가 나온 결과… 돈길 달은 ${best.month}월이래. 너도 궁금하지?`,
        imageUrl: `${location.origin}/api/og/${vessel.slug}?v=2`,
        url,
        buttons: [{ title: "내 사주도 확인하기", url: `${location.origin}/input?from=finale` }],
      })
    ) return;
    const text = `사주가 나한테 한 말: "${hook}"`;
    if (navigator.share) {
      try { await navigator.share({ title: "재물그릇", text, url }); return; } catch { /* 취소 */ }
    }
    await copyLink(text, url);
  }

  async function copyLink(text?: string, url?: string) {
    track("share_click", { kind: "paid_finale_copy" });
    const u = url ?? `${location.origin}/t/${vessel.slug}/${best.month}?from=finale`;
    await navigator.clipboard.writeText(text ? `${text}\n${u}` : u);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="mt-10">
      <div
        className="rounded-2xl px-5 py-5 text-center"
        style={{ background: "linear-gradient(135deg, var(--gold-deep), var(--gold))", color: "#fff" }}
      >
        <p className="text-[12px] font-semibold tracking-wider opacity-85">이 풀이, 아직 반쪽이에요</p>
        <div className="mt-3 flex items-center justify-center gap-3">
          <PremiumVessel code={vessel.code} size={64} />
          <span className="text-[20px] font-extrabold opacity-70">+</span>
          <span
            className="flex items-center justify-center rounded-full text-[28px] font-extrabold"
            style={{ width: 64, height: 64, background: "rgba(255,255,255,0.25)" }}
          >
            ?
          </span>
        </div>
        <p className="mt-3 text-[15px] font-bold leading-snug">옆자리 그 사람은 무슨 그릇일까요?</p>
        <p className="mt-1 text-[12px] opacity-85">상대가 자기 생년월일을 넣어야만 궁합이 완성돼요</p>
        <button
          onClick={onAsk}
          className="mt-4 w-full rounded-xl px-4 py-3 text-[15px] font-bold transition-transform active:scale-[0.97]"
          style={{ background: "rgba(255,255,255,0.94)", color: "var(--gold-deep)" }}
        >
          {copied ? "복사 완료 — 붙여넣기만 하면 돼요" : "너는 무슨 그릇이야? 물어보기"}
        </button>
        <button
          onClick={onKakao}
          className="mt-2 w-full rounded-xl border px-4 py-2.5 text-[13px] font-semibold transition-transform active:scale-[0.97]"
          style={{ borderColor: "rgba(255,255,255,0.5)", color: "#fff", background: "transparent" }}
        >
          내 결과 자랑하기 — &ldquo;{hook.slice(0, 18)}{hook.length > 18 ? "…" : ""}&rdquo;
        </button>
      </div>
      <p className="mt-5 text-center text-[12px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
        이 풀이는 당신 사주로만 생성된 세상에 1개짜리 — 결제한 이 기기에서 180일간 다시 열람할 수 있어요.
      </p>
      <p className="mt-3 text-center">
        <Link href={`/r/${vessel.slug}`} className="text-[13px] underline underline-offset-2" style={{ color: "var(--ink-soft)" }}>
          내 그릇 카드로 돌아가기
        </Link>
      </p>
    </div>
  );
}

/* D-데이 칩 — 엔진 계산값으로 "가장 가까운 돈길 달까지 D-N". AI 비용 0, 결제 3초 안의 첫 보상 */
function DdayChip({ months }: { months: Reading["months"] }) {
  const best = months.find((m) => m.level === 3);
  if (!best) return null;
  const target = new Date(best.year, best.month - 1, 1);
  const days = Math.ceil((target.getTime() - Date.now()) / 86400000);
  if (days <= 0) return (
    <span className="mt-3 rounded-full px-4 py-1.5 text-[13px] font-bold" style={{ background: "var(--gold)", color: "#fff" }}>
      지금이 돈길 달 — {best.month}월
    </span>
  );
  return (
    <span className="mt-3 rounded-full px-4 py-1.5 text-[13px] font-bold" style={{ background: "var(--gold)", color: "#fff" }}>
      가장 가까운 돈길 달까지 D-{days}
    </span>
  );
}

/* 궁합 섹션 — "돈이 통하는 사람, 돈 얘기가 꼬이는 사람"
   뼈대는 정적 카피(synergy.ts, 비용 0), AI는 브릿지 2문장(synergyNote)만.
   행동 뒤·피날레 앞 = 개인 가치 수취가 끝난 '선물' 위치라 공유 전환이 가장 높다. */
function SynergySection({ vessel, reading }: { vessel: VesselType; reading: Reading }) {
  const [picked, setPicked] = useState<VesselType | null>(null);
  const copy = SYNERGY_COPY[vessel.code];
  const good = VESSEL_TYPES[vessel.matchGood];
  const bad = VESSEL_TYPES[vessel.matchBad];
  const best = reading.months.find((m) => m.level === 3) ?? reading.months[0];

  async function onAsk() {
    track("share_click", { kind: "synergy_ask" });
    const url = `${location.origin}/vs/${vessel.slug}?from=ask`;
    if (
      await shareToKakao({
        title: `나 ${vessel.name}(100명 중 ${vessel.per100}명)이래 — 너는 무슨 그릇이야?`,
        description: `나랑 돈이 통하는 그릇이 따로 있대. 우리 맞는지 보게, 생년월일만 넣으면 무료야`,
        imageUrl: `${location.origin}/api/og/${vessel.slug}?vs=1&v=2`,
        url,
        buttons: [{ title: "내 그릇 확인하기 (무료)", url: `${location.origin}/vs/${vessel.slug}?from=ask` }],
      })
    ) return;
    if (navigator.share) {
      try { await navigator.share({ title: "재물그릇", text: `나 ${vessel.name}이래 — 너는 무슨 그릇이야?`, url }); return; } catch { /* 취소 */ }
    }
    await navigator.clipboard.writeText(`나 ${vessel.name}이래 — 너는 무슨 그릇이야?\n${url}`);
  }

  return (
    <section className="mt-8">
      <h2 className="mb-1 text-[13px] font-bold tracking-wider" style={{ color: "var(--ink-faint)" }}>
        돈이 통하는 사람, 돈 얘기가 꼬이는 사람
      </h2>
      <p className="mb-3 text-[12px]" style={{ color: "var(--ink-faint)" }}>돈 궁합은 성격 궁합과 달라요</p>

      {reading.synergyNote && (
        <p className="mb-4 text-[15px] leading-relaxed">{reading.synergyNote}</p>
      )}

      {/* 시너지 카드 */}
      <div className="card px-4 py-4">
        <div className="flex items-center gap-3">
          <PremiumVessel code={vessel.code} size={52} />
          <span className="text-[18px]" style={{ color: "var(--gold-deep)" }}>+</span>
          <PremiumVessel code={good.code} size={52} />
          <div className="ml-1">
            <p className="text-[11px] font-bold" style={{ color: "var(--gold-deep)" }}>돈이 통하는 그릇</p>
            <p className="text-[16px] font-extrabold">{good.name}</p>
          </div>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed">{copy.good.roles} {copy.good.why}</p>
        <p className="mt-2 rounded-lg px-3 py-2 text-[13px] leading-relaxed" style={{ background: "var(--bg)" }}>
          <b>함께 하면:</b> {copy.good.action}
        </p>
      </div>

      {/* 마찰 카드 */}
      <div className="card mt-3 px-4 py-4">
        <div className="flex items-center gap-3">
          <PremiumVessel code={vessel.code} size={52} />
          <span className="text-[18px]" style={{ color: "var(--ink-faint)" }}>≠</span>
          <PremiumVessel code={bad.code} size={52} />
          <div className="ml-1">
            <p className="text-[11px] font-bold" style={{ color: "var(--ink-faint)" }}>돈 얘기가 꼬이는 그릇</p>
            <p className="text-[16px] font-extrabold">{bad.name}</p>
          </div>
        </div>
        <p className="mt-3 text-[14px] leading-relaxed">{copy.bad.scene} {copy.bad.reframe}</p>
        <p className="mt-2 rounded-lg px-3 py-2 text-[13px] leading-relaxed" style={{ background: "var(--bg)" }}>
          <b>이렇게 풀어요:</b> {copy.bad.fix}
        </p>
      </div>

      {/* 연인·부부 훅 + CTA */}
      <div className="mt-4 rounded-2xl px-5 py-4 text-center" style={{ background: "linear-gradient(135deg, var(--gold-deep), var(--gold))", color: "#fff" }}>
        <p className="text-[14px] font-bold leading-relaxed">
          지금 옆에 있는 사람의 그릇을 모른다면, 이 페이지는 반쪽이에요.
        </p>
        <p className="mt-1 text-[12px] opacity-85">그 사람이 무슨 그릇이냐에 따라 위의 처방이 달라져요 · {best.month}월이 오기 전에</p>
        <button
          onClick={onAsk}
          className="mt-3 w-full rounded-xl px-4 py-3 text-[15px] font-bold transition-transform active:scale-[0.97]"
          style={{ background: "rgba(255,255,255,0.94)", color: "var(--gold-deep)" }}
        >
          너는 무슨 그릇이야? 물어보기
        </button>
      </div>

      {/* 즉석 확인 — 상대 유형을 이미 아는 독자용, 엔진 판정이라 비용 0 */}
      <details className="mt-3">
        <summary className="cursor-pointer text-[13px] underline underline-offset-2" style={{ color: "var(--ink-soft)" }}>
          상대 유형을 이미 안다면 — 바로 대보기
        </summary>
        <div className="mt-2 grid grid-cols-4 gap-1.5">
          {Object.values(VESSEL_TYPES).map((v) => (
            <button
              key={v.code}
              onClick={() => setPicked(v)}
              className="rounded-lg px-1 py-2 text-[11px] font-semibold"
              style={{
                background: picked?.code === v.code ? "var(--gold)" : "var(--card)",
                color: picked?.code === v.code ? "#fff" : "var(--ink)",
              }}
            >
              {v.name}
            </button>
          ))}
        </div>
        {picked && (
          <div className="card mt-2 px-4 py-3">
            <p className="text-[14px] font-bold">{vsVerdict(vessel, picked).title}</p>
            <p className="mt-1 text-[13px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
              {vsVerdict(vessel, picked).detail}
            </p>
          </div>
        )}
      </details>
    </section>
  );
}

/* 팩폭 캡처 카드 — 풀이에서 생성된 '이 사주 전용 한 줄'을 카톡 카드로 배달한다.
   무료 카드의 바이럴 훅(팩폭)을 유료 단계에 복제하는 장치. URL엔 유형+달 숫자만 (절대규칙 5) */
function ShareLineCard({ vessel, shareLine, months }: { vessel: VesselType; shareLine: string; months: Reading["months"] }) {
  const [copied, setCopied] = useState(false);
  const best = months.find((m) => m.level === 3) ?? months[0];
  async function onShare() {
    track("share_click", { kind: "shareline" });
    const url = `${location.origin}/t/${vessel.slug}/${best.month}?from=shareline`;
    if (
      await shareToKakao({
        title: `"${shareLine}"`,
        description: `${vessel.name} 사주 계산이 나한테 한 말… 너도 들어볼래?`,
        imageUrl: `${location.origin}/api/og/${vessel.slug}?v=2`,
        url,
        buttons: [{ title: "내 사주도 팩폭 듣기", url: `${location.origin}/input?from=shareline` }],
      })
    ) return;
    const text = `사주가 나한테 한 말: "${shareLine}"`;
    if (navigator.share) {
      try { await navigator.share({ title: "재물그릇", text, url }); return; } catch { /* 취소 */ }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }
  return (
    <div className="mt-3 w-full">
      <div
        className="rounded-2xl px-5 py-4 text-left"
        style={{ background: "linear-gradient(135deg, var(--gold-deep), var(--gold))", color: "#fff" }}
      >
        <p className="text-[11px] font-semibold tracking-wider opacity-80">이 사주에 날리는 팩폭 한 줄</p>
        <p className="mt-1.5 text-[17px] font-extrabold leading-snug">&ldquo;{shareLine}&rdquo;</p>
        <button
          onClick={onShare}
          className="mt-3 w-full rounded-xl px-4 py-2.5 text-[14px] font-bold transition-transform active:scale-[0.97]"
          style={{ background: "rgba(255,255,255,0.92)", color: "var(--gold-deep)" }}
        >
          {copied ? "복사 완료 — 붙여넣기만 하면 돼요" : "이 한 줄, 친구한테 던지기"}
        </button>
      </div>
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
    // 1순위 카톡 카드(키 설정 시) — 결제자의 자랑이 이미지 카드로 배달된다
    if (
      await shareToKakao({
        title: `내 돈길 열리는 달은 ${best.month}월`,
        description: `${vessel.name}의 12개월 계산 결과 — 네 달은 언제야?`,
        imageUrl: `${location.origin}/api/og/${vessel.slug}?v=2`,
        url,
        buttons: [{ title: "내 돈길 달 확인하기", url: `${location.origin}/input?from=paidshare` }],
      })
    ) return;
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

/* 오행 밸런스 한 컷 도식 — "왜 이 유형인지"의 근거를 숫자 나열 대신 막대로 보여준다 */
const ELEMENT_COLORS: Record<string, string> = {
  목: "#7da460",
  화: "#d97757",
  토: "#c9a227",
  금: "#9aa5b1",
  수: "#5b8db8",
};

function ElementBars({ elements }: { elements: Record<string, number> }) {
  const order = ["목", "화", "토", "금", "수"];
  const max = Math.max(1, ...order.map((k) => elements[k] ?? 0));
  return (
    <div className="card mb-4 px-4 py-3">
      <p className="mb-2 text-[11px] font-semibold" style={{ color: "var(--ink-faint)" }}>
        내 사주의 다섯 기운 — 이 균형이 그릇 모양을 정해요
      </p>
      <div className="flex items-end gap-2">
        {order.map((k) => {
          const v = elements[k] ?? 0;
          return (
            <div key={k} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[11px] font-bold" style={{ color: v === 0 ? "#c0392b" : "var(--ink-soft)" }}>
                {v === 0 ? "없음" : v}
              </span>
              <div className="flex w-full items-end rounded-t" style={{ height: 44 }}>
                <div
                  className="w-full rounded-t"
                  style={{ height: `${Math.max(6, (v / max) * 100)}%`, background: v === 0 ? "#eee4da" : ELEMENT_COLORS[k] }}
                />
              </div>
              <span className="text-[12px] font-semibold">{k}</span>
            </div>
          );
        })}
      </div>
    </div>
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
