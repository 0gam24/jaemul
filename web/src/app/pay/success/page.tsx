"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { saveReceipt, PRICE_KRW } from "@/lib/pay";

/**
 * 토스페이 인증 완료 리다이렉트 → 서버 승인(confirm) → 영수증 저장 → 풀이 페이지로.
 *
 * 인증은 아직 결제가 아니다. 서버가 승인을 마치기 전까지는 "결제 완료"라고 말하지 않는다.
 * 서버로 보내는 건 주문번호 하나뿐 — 금액도 토큰도 보내지 않는다(전부 서버가 조회한다).
 */

export default function PaySuccessPage() {
  const router = useRouter();
  const [state, setState] = useState<"confirming" | "fail">("confirming");
  const [message, setMessage] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const orderNo = new URLSearchParams(location.search).get("orderNo");
    if (!orderNo) {
      setMessage("결제 정보가 올바르지 않아요.");
      setState("fail");
      return;
    }
    fetch("/api/pay/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderNo }),
    })
      .then(async (r) => {
        const data = (await r.json()) as { ok?: boolean; message?: string };
        if (!r.ok || !data.ok) {
          setMessage(data.message ?? "결제 승인에 실패했어요. 결제는 청구되지 않았어요.");
          setState("fail");
          return;
        }
        saveReceipt(orderNo);
        router.replace("/p");
      })
      .catch(() => {
        setMessage("네트워크 문제로 승인 확인을 못 했어요. 잠시 후 다시 시도해 주세요.");
        setState("fail");
      });
  }, [router]);

  if (state === "fail") {
    return (
      <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
        <h1 className="text-[20px] font-extrabold">결제를 마무리하지 못했어요</h1>
        <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>{message}</p>
        <Link href="/pay" className="btn-primary mt-8">다시 결제하기</Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <p className="text-[15px] font-semibold" style={{ color: "var(--gold-deep)" }}>
        결제를 확인하는 중이에요…
      </p>
      <p className="mt-2 text-[12px]" style={{ color: "var(--ink-faint)" }}>
        {PRICE_KRW.toLocaleString()}원 · 몇 초면 끝나요
      </p>
    </div>
  );
}
