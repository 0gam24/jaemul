"use client";

import { motion, useReducedMotion } from "motion/react";

/**
 * 그릇 아이콘 (M1 공통 실루엣) — 시그니처 연출의 본체.
 * 금빛 액체가 차오르는 애니메이션. 16종 개별 캐릭터는 후속 교체 지점.
 */
export function VesselIcon({
  size = 160,
  fill,          // 0~1 액체 수위
  tint,          // 오행 파스텔
  animate = false,
  delay = 0,
}: {
  size?: number;
  fill: number;
  tint: string;
  animate?: boolean;
  delay?: number;
}) {
  const reduced = useReducedMotion();
  const level = Math.max(0.15, Math.min(0.92, fill));
  // viewBox 높이 120 기준, 그릇 내부는 y 28~104
  const topY = 104 - (104 - 28) * level;
  const doAnim = animate && !reduced;

  return (
    <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="재물그릇">
      <defs>
        <clipPath id="vessel-clip">
          <path d="M30 30 C30 22 42 18 60 18 C78 18 90 22 90 30 C96 44 98 62 92 78 C87 92 76 102 60 102 C44 102 33 92 28 78 C22 62 24 44 30 30 Z" />
        </clipPath>
      </defs>

      {/* 액체 */}
      <g clipPath="url(#vessel-clip)">
        <motion.rect
          x="16"
          width="88"
          height="110"
          fill="var(--gold)"
          opacity="0.9"
          initial={doAnim ? { y: 112 } : false}
          animate={{ y: topY }}
          transition={{ duration: doAnim ? 1.3 : 0, delay, ease: [0.23, 1, 0.32, 1] }}
        />
        {/* 수면 하이라이트 */}
        <motion.ellipse
          cx="60"
          rx="34"
          ry="4"
          fill="#f2c479"
          initial={doAnim ? { cy: 112, opacity: 0 } : false}
          animate={{ cy: topY + 2, opacity: 1 }}
          transition={{ duration: doAnim ? 1.3 : 0, delay, ease: [0.23, 1, 0.32, 1] }}
        />
      </g>

      {/* 그릇 몸체 */}
      <path
        d="M30 30 C30 22 42 18 60 18 C78 18 90 22 90 30 C96 44 98 62 92 78 C87 92 76 102 60 102 C44 102 33 92 28 78 C22 62 24 44 30 30 Z"
        fill="none"
        stroke="var(--ink)"
        strokeWidth="4.5"
        strokeLinecap="round"
      />
      {/* 입구 타원 */}
      <ellipse cx="60" cy="26" rx="30" ry="7" fill="none" stroke="var(--ink)" strokeWidth="4" />
      {/* 오행 밑받침 */}
      <path d="M42 106 L78 106" stroke={tint} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
