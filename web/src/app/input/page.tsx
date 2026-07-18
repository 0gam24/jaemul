"use client";

import { useEffect, useMemo, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { saveResult } from "@/lib/result-store";
import { track } from "@/lib/track";

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1929 }, (_, i) => THIS_YEAR - i); // 1930~올해 (신생아 포함)
const HOURS = Array.from({ length: 24 }, (_, i) => i);

/* 봇 방어 (M4) — 무료 일일 횟수 제한(기기 기준) + Turnstile 스캐폴드.
   Turnstile은 사이트 키가 있을 때만 위젯을 띄운다. 서버 검증은 배포 시 엣지에서 (TODO M4). */
const DAILY_LIMIT = 10;
const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

function runsKey(): string {
  const d = new Date();
  return `jaemul.runs.${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
}
function runsToday(): number {
  try { return Number(localStorage.getItem(runsKey()) ?? 0); } catch { return 0; }
}
function bumpRuns(): void {
  try { localStorage.setItem(runsKey(), String(runsToday() + 1)); } catch { /* ignore */ }
}

export default function InputPage() {
  const router = useRouter();
  const [calendar, setCalendar] = useState<"solar" | "lunar">("solar");
  const [leap, setLeap] = useState(false);
  const [gender, setGender] = useState<"남" | "여" | null>(null);
  const [year, setYear] = useState("");
  const [month, setMonth] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [timeUnknown, setTimeUnknown] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tsToken, setTsToken] = useState<string | null>(null);

  // Turnstile 콜백 — 위젯 완료 토큰을 수집해 완료 전 제출을 막는다.
  // 주의: 토큰의 서버(siteverify) 검증은 M4 배포에서 엣지로 붙인다 — 현재는 클라이언트 수집만.
  useEffect(() => {
    if (!TURNSTILE_KEY) return;
    (window as unknown as Record<string, unknown>).onTurnstileOk = (t: string) => setTsToken(t);
  }, []);

  const valid = useMemo(() => {
    const y = +year, m = +month, d = +day;
    if (!gender || !y || !m || !d) return false;
    if (m < 1 || m > 12 || d < 1 || d > 31) return false;
    if (!timeUnknown && hour === "") return false;
    return true;
  }, [gender, year, month, day, hour, timeUnknown]);

  async function onSubmit() {
    if (!valid || busy) return;
    if (runsToday() >= DAILY_LIMIT) {
      alert("오늘 무료 계산 횟수를 다 썼어요. 내일 다시 만나요!");
      return;
    }
    setBusy(true);
    try {
      // 만세력 엔진은 이 페이지에서만 로드 (결과 랜딩 LCP 보호)
      const [{ getSaju }, { classifyVessel, vesselBySlug }] = await Promise.all([
        import("@/lib/manseryeok"),
        import("@/lib/vessel-types"),
      ]);
      const input = {
        year: +year,
        month: +month,
        day: +day,
        hour: timeUnknown ? 12 : +hour,
        minute: timeUnknown || minute === "" ? 0 : +minute,
        gender: gender!,
        calendar,
        leap: calendar === "lunar" ? leap : false,
        timeUnknown,
      };
      const { saju } = getSaju(input);
      const vessel = classifyVessel(saju);
      saveResult({ slug: vessel.slug, input });
      bumpRuns();
      track("free_run", { slug: vessel.slug });
      // 대결 모드: /vs/[상대]?로 진입한 경우 대결 결과로 이동
      const vs = new URLSearchParams(location.search).get("vs");
      if (vs && vesselBySlug(vs)) {
        router.push(`/vs/${vs}/${vessel.slug}`);
        return;
      }
      // 스토리지 차단 환경에선 연출만 생략하고 결과는 정상 표시
      try { sessionStorage.setItem("jaemul.reveal", "1"); } catch { /* ignore */ }
      router.push(`/r/${vessel.slug}`);
    } catch {
      setBusy(false);
      alert("계산 중 문제가 생겼어요. 입력값을 확인하고 다시 시도해 주세요.");
    }
  }

  return (
    <div className="px-5 pt-10 pb-8">
      <p className="text-[13px] font-semibold tracking-wide" style={{ color: "var(--gold-deep)" }}>
        무료 · 10초면 끝나요
      </p>
      <h1 className="mt-2 text-[26px] font-bold leading-snug">
        태어난 순간을 알려주세요
        <br />
        <span style={{ color: "var(--ink-soft)" }}>그릇을 꺼내 볼게요</span>
      </h1>

      {/* 양력/음력 */}
      <div className="mt-8">
        <div className="seg" role="tablist" aria-label="달력 선택">
          <button data-on={calendar === "solar"} onClick={() => setCalendar("solar")}>양력</button>
          <button data-on={calendar === "lunar"} onClick={() => setCalendar("lunar")}>음력</button>
        </div>
        {calendar === "lunar" && (
          <label className="mt-3 flex items-center gap-2 text-[14px]" style={{ color: "var(--ink-soft)" }}>
            <input type="checkbox" checked={leap} onChange={(e) => setLeap(e.target.checked)} className="h-4 w-4 accent-[#d98e32]" />
            윤달이에요
          </label>
        )}
      </div>

      {/* 생년월일 */}
      <div className="mt-5 grid grid-cols-3 gap-2">
        <select className="field" value={year} onChange={(e) => setYear(e.target.value)} aria-label="년">
          <option value="">년</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}년</option>)}
        </select>
        <select className="field" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="월">
          <option value="">월</option>
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
        </select>
        <select className="field" value={day} onChange={(e) => setDay(e.target.value)} aria-label="일">
          <option value="">일</option>
          {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}일</option>)}
        </select>
      </div>

      {/* 출생 시간 */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select className="field" value={hour} onChange={(e) => setHour(e.target.value)} disabled={timeUnknown} aria-label="시">
          <option value="">태어난 시</option>
          {HOURS.map((h) => <option key={h} value={h}>{h}시</option>)}
        </select>
        <select className="field" value={minute} onChange={(e) => setMinute(e.target.value)} disabled={timeUnknown} aria-label="분">
          <option value="">분 (모르면 비워두세요)</option>
          {[0, 10, 20, 30, 40, 50].map((m) => <option key={m} value={m}>{m}분</option>)}
        </select>
      </div>
      <label className="mt-3 flex items-center gap-2 text-[14px]" style={{ color: "var(--ink-soft)" }}>
        <input
          type="checkbox"
          checked={timeUnknown}
          onChange={(e) => setTimeUnknown(e.target.checked)}
          className="h-4 w-4 accent-[#d98e32]"
        />
        태어난 시간을 몰라요 (시간 빼고 봐드려요)
      </label>

      {/* 성별 */}
      <div className="mt-5">
        <div className="seg" role="tablist" aria-label="성별">
          <button data-on={gender === "여"} onClick={() => setGender("여")}>여성</button>
          <button data-on={gender === "남"} onClick={() => setGender("남")}>남성</button>
        </div>
      </div>

      {/* Turnstile — 키가 설정된 배포 환경에서만 노출. 완료 전엔 제출 버튼 비활성 */}
      {TURNSTILE_KEY && (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" strategy="lazyOnload" />
          <div className="cf-turnstile mt-6" data-sitekey={TURNSTILE_KEY} data-theme="light" data-callback="onTurnstileOk" />
        </>
      )}

      <button
        className="btn-primary mt-8"
        disabled={!valid || busy || (!!TURNSTILE_KEY && !tsToken)}
        onClick={onSubmit}
      >
        {busy ? "그릇 꺼내는 중…" : "무료로 내 그릇 확인"}
      </button>

      <p className="mt-4 text-center text-[12px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
        입력한 생년월일시는 서버에 저장되지 않아요.
        <br />
        계산은 지금 이 기기 안에서 끝납니다.
      </p>
    </div>
  );
}
