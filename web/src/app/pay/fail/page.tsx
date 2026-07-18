"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** 결제 인증 실패/취소 리다이렉트 — 청구되지 않았음을 명확히 안내 */

export default function PayFailPage() {
  const [message, setMessage] = useState("결제가 진행되지 않았어요.");

  useEffect(() => {
    const m = new URLSearchParams(location.search).get("message");
    if (m) setMessage(m);
  }, []);

  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-6 text-center">
      <h1 className="text-[20px] font-extrabold">결제가 취소됐어요</h1>
      <p className="mt-2 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
        {message}
        <br />
        카드에 청구된 금액은 없어요.
      </p>
      <Link href="/pay" className="btn-primary mt-8">다시 시도하기</Link>
      <Link href="/" className="mt-4 text-[13px] underline underline-offset-2" style={{ color: "var(--ink-soft)" }}>
        홈으로
      </Link>
    </div>
  );
}
