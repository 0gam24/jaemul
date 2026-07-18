"use client";

import { useState } from "react";
import type { VesselType } from "@/lib/vessel-types";

export function VsShareButton({ a, b, verdictTitle }: { a: VesselType; b: VesselType; verdictTitle: string }) {
  const [copied, setCopied] = useState(false);

  async function onShare() {
    const url = `${location.origin}/vs/${a.slug}/${b.slug}?from=vs`;
    const text = `${a.name} vs ${b.name} — 판정: ${verdictTitle}. 우리 그릇 대결 결과 봐봐`;
    if (navigator.share) {
      try { await navigator.share({ title: "그릇 대결", text, url }); return; } catch { /* 취소 */ }
    }
    await navigator.clipboard.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="btn-primary mt-6" onClick={onShare}>
      {copied ? "복사했어요 — 붙여넣기만 하세요" : "대결 결과 공유하기"}
    </button>
  );
}
