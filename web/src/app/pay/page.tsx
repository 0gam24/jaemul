"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { loadTossPayments, ANONYMOUS, type TossPaymentsWidgets } from "@tosspayments/tosspayments-sdk";
import { loadResult } from "@/lib/result-store";
import { vesselBySlug, type VesselType } from "@/lib/vessel-types";
import { PremiumVessel } from "@/components/PremiumVessel";
import { PRICE_KRW, ORDER_NAME, TOSS_CLIENT_KEY, newOrderId } from "@/lib/pay";

/**
 * 결제 페이지 (M3) — 토스페이먼츠 결제위젯 v2
 * - 금액은 표시용일 뿐, 진짜 검증은 /api/pay/confirm 서버 상수로 (절대규칙 7)
 * - 결제 전 고지: 청약철회 불가 동의 체크 필수 (절대규칙 4) + 무료 미리보기는 결과 카드가 제공
 * - 비회원 결제(ANONYMOUS) — 가입 없음 원칙 유지, 개인정보 미수집
 */

export default function PayPage() {
  const [state, setState] = useState<"init" | "ready" | "none" | "paying">("init");
  const [vessel, setVessel] = useState<VesselType | null>(null);
  const [agreed, setAgreed] = useState(false);
  const widgetsRef = useRef<TossPaymentsWidgets | null>(null);
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

    (async () => {
      const toss = await loadTossPayments(TOSS_CLIENT_KEY);
      const widgets = toss.widgets({ customerKey: ANONYMOUS });
      await widgets.setAmount({ currency: "KRW", value: PRICE_KRW });
      await Promise.all([
        widgets.renderPaymentMethods({ selector: "#payment-method", variantKey: "DEFAULT" }),
        widgets.renderAgreement({ selector: "#agreement", variantKey: "AGREEMENT" }),
      ]);
      widgetsRef.current = widgets;
      setState("ready");
    })().catch(() => setState("none"));
  }, []);

  async function onPay() {
    if (!widgetsRef.current || !agreed || state === "paying") return;
    setState("paying");
    try {
      await widgetsRef.current.requestPayment({
        orderId: newOrderId(),
        orderName: ORDER_NAME,
        successUrl: `${location.origin}/pay/success`,
        failUrl: `${location.origin}/pay/fail`,
      });
    } catch {
      // 사용자가 결제창을 닫음 — 다시 시도 가능 상태로
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
          <li>◆ 돈 들어오는 달 — 앞으로 12개월 캘린더</li>
          <li>◆ 다음 행동 3가지 + 조심할 지출 구멍</li>
        </ul>
      </div>

      {/* 토스 결제 UI */}
      <div className="card mt-4 overflow-hidden">
        <div id="payment-method" />
        <div id="agreement" />
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
        {state === "init" ? "결제 수단 불러오는 중…" : state === "paying" ? "결제창 여는 중…" : `${PRICE_KRW.toLocaleString()}원 결제하기`}
      </button>

      <p className="mt-4 text-center text-[12px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
        결제 정보는 토스페이먼츠가 안전하게 처리하며,
        <br />
        생년월일시는 결제 정보와 함께 저장되지 않아요.
      </p>
    </div>
  );
}
