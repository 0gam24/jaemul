"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadResult } from "@/lib/result-store";
import { vesselBySlug, type VesselType } from "@/lib/vessel-types";
import { PremiumVessel } from "@/components/PremiumVessel";
import { PRICE_KRW, ORDER_NAME } from "@/lib/pay";

/**
 * 결제 페이지 (M3) — 토스페이 간편결제
 *
 * 토스페이먼츠 위젯과 달리 화면 안에 결제 UI를 심지 않는다. 서버가 결제를 만들고
 * 구매자를 토스페이 결제 페이지로 보냈다가 되돌려받는 방식이다.
 *   [결제하기] → /api/pay/create → checkoutPage로 이동 → 토스 앱 인증 → /pay/success
 *
 * - 금액은 서버가 정한다. 이 화면의 숫자는 표시용일 뿐이다 (절대규칙 7)
 * - 결제 전 고지: 청약철회 불가 동의 체크 필수 (절대규칙 4) + 무료 미리보기는 결과 카드가 제공
 * - 가입 없음 원칙 유지, 개인정보 미수집
 */

export default function PayPage() {
  const [state, setState] = useState<"init" | "ready" | "none" | "paying">("init");
  const [vessel, setVessel] = useState<VesselType | null>(null);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const stored = loadResult();
    if (!stored) {
      setState("none");
      return;
    }
    setVessel(vesselBySlug(stored.slug));
    setState("ready");
  }, []);

  async function onPay() {
    if (!agreed || state !== "ready") return;
    setState("paying");
    setError("");
    try {
      const res = await fetch("/api/pay/create", { method: "POST" });
      const data = (await res.json()) as { checkoutPage?: string; message?: string };
      if (!res.ok || !data.checkoutPage) {
        setError(data.message ?? "결제를 시작하지 못했어요. 잠시 후 다시 시도해 주세요.");
        setState("ready");
        return;
      }
      // 토스페이 결제 페이지로 이동 — 인증을 마치면 /pay/success로 돌아온다
      location.href = data.checkoutPage;
    } catch {
      setError("네트워크 문제로 결제를 시작하지 못했어요.");
      setState("ready");
    }
  }

  if (state === "none") {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[20px] font-extrabold">그릇을 먼저 꺼내야 해요</h1>
        <p className="mt-2 text-[14px]" style={{ color: "var(--ink-soft)" }}>
          상세 풀이는 무료 그릇 결과를 바탕으로 만들어져요.
        </p>
        <Link href="/input" className="btn-primary mt-8">무료로 내 그릇 확인</Link>
      </div>
    );
  }

  return (
    <div className="px-5 pt-8 pb-10">
      <div className="flex flex-col items-center text-center">
        {vessel && <PremiumVessel code={vessel.code} size={90} />}
        <h1 className="mt-3 text-[22px] font-extrabold">{ORDER_NAME}</h1>
        <p className="mt-1 text-[14px]" style={{ color: "var(--ink-soft)" }}>
          {vessel?.name} 사주로만 생성되는 세상에 1개짜리
        </p>
        <p className="mt-3 text-[28px] font-extrabold" style={{ color: "var(--gold-deep)" }}>
          {PRICE_KRW.toLocaleString()}원
        </p>
      </div>

      {/* 상품 구성 — 결제 전 무엇을 받는지 명확히 (시험사용은 무료 카드가 제공) */}
      <div className="card mt-5 px-5 py-4">
        <ul className="space-y-1.5 text-[14px]">
          <li>◆ 나의 재물 구조 심층 풀이</li>
          <li>◆ 10년 단위 돈의 계절(대운) 해석</li>
          <li>◆ 앞으로 12개월, 돈 들어오는 달 캘린더</li>
          <li>◆ 다음 행동 3가지 + 조심할 지출 구멍</li>
        </ul>
      </div>

      {/* 제공 방식·이용 기간 고지 — 전자상거래법 + PG 심사 요건: 결제 전에 소비자가 확인 가능해야 함 */}
      <div className="card mt-3 px-5 py-3.5 text-[13px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        <p>
          <b style={{ color: "var(--ink)" }}>제공 방식·시점</b>
          <br />
          결제 완료 즉시 자동 생성, 1~2분 내 열람 (결제일 당일 제공 완료)
        </p>
        <p className="mt-2">
          <b style={{ color: "var(--ink)" }}>재열람 기간</b>
          <br />
          결제일부터 180일간, 결제한 기기에서 횟수 제한 없이 재열람
        </p>
      </div>

      {/* 결제수단 안내 — 결제 버튼을 누르기 전에 토스 앱이 필요하다는 걸 알 수 있어야 한다 */}
      <div className="card mt-3 px-5 py-3.5 text-[13px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        <p>
          <b style={{ color: "var(--ink)" }}>결제수단</b>
          <br />
          토스페이 간편결제. 버튼을 누르면 토스 결제 화면으로 이동하고, 토스에 등록된 카드·계좌로
          결제한 뒤 이 페이지로 돌아와요.
        </p>
      </div>

      {/* 청약철회 고지 — 법적 필수, 체크 전 결제 불가 */}
      <label className="mt-4 flex items-start gap-2 text-[13px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#d98e32]"
        />
        <span>
          본 상품은 구매 즉시 제공되는 디지털콘텐츠로, <b>열람 후에는 청약철회(환불)가 불가</b>함을
          확인했습니다. <Link href="/refund" className="underline underline-offset-2">환불정책</Link>
        </span>
      </label>

      <button
        className="btn-primary mt-5"
        disabled={state !== "ready" || !agreed}
        onClick={onPay}
      >
        {state === "init"
          ? "준비하는 중…"
          : state === "paying"
            ? "토스로 이동하는 중…"
            : `토스페이로 ${PRICE_KRW.toLocaleString()}원 결제하기`}
      </button>

      {error && (
        <p className="mt-3 text-center text-[13px]" style={{ color: "var(--ink-soft)" }}>
          {error}
        </p>
      )}

      <p className="mt-4 text-center text-[12px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
        결제 정보는 토스페이가 안전하게 처리하며,
        <br />
        생년월일시는 결제 정보와 함께 저장되지 않아요.
      </p>
    </div>
  );
}
