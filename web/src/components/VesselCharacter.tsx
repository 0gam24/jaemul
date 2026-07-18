import type { VesselCode } from "@/lib/vessel-types";

/**
 * 재물그릇 캐릭터 16종 — A안(귀여운 의인화) 확정 (2026-07-17 사장님 결정)
 *
 * 시리즈 규칙:
 * - 유형별 그릇 형태는 전부 다르게, 얼굴(점눈+미소+볼터치)·비례·선 굵기는 통일
 * - 오행 파스텔 팔레트 고정, 금빛 재물 = #F2B24C
 * - OG 카드(satori)에서도 쓰므로 CSS 변수 금지 — 전부 hex
 */

const INK = "#2b2118";
const GOLD = "#F2B24C";
const GOLD_HI = "#F8D48A";

/** 공통 얼굴 (cx=100 기준, y로 위치 조정) — satori 호환을 위해 JSX 컴포넌트가 아닌 일반 함수로 호출 */
function face(y: number, blush: string, closed = false) {
  return (
    <g>
      {closed ? (
        <g>
          <path d={`M76 ${y} C79 ${y + 4} 85 ${y + 4} 88 ${y}`} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <path d={`M112 ${y} C115 ${y + 4} 121 ${y + 4} 124 ${y}`} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
        </g>
      ) : (
        <g>
          <circle cx="82" cy={y} r="5.5" fill={INK} />
          <circle cx="118" cy={y} r="5.5" fill={INK} />
        </g>
      )}
      <path d={`M92 ${y + 14} C96 ${y + 19} 104 ${y + 19} 108 ${y + 14}`} fill="none" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <ellipse cx="66" cy={y + 12} rx="7" ry="4" fill={blush} />
      <ellipse cx="134" cy={y + 12} rx="7" ry="4" fill={blush} />
    </g>
  );
}

const shadow = <ellipse cx="100" cy="186" rx="48" ry="6" fill={INK} opacity="0.07" />;

/* 오행 팔레트 */
const P = {
  화: { body: "#E58368", dark: "#B85C44", light: "#F5A98E", blush: "#F5A98E" },
  토: { body: "#E5B76A", dark: "#B98A3F", light: "#F2D5A0", blush: "#F0A88E" },
  수: { body: "#7D9CC0", dark: "#5C7696", light: "#A8C0DC", blush: "#A8C0DC" },
  목: { body: "#7FB77E", dark: "#5E8E5D", light: "#A8D0A7", blush: "#F0A88E" },
  금: { body: "#C4C8C7", dark: "#9AA0A0", light: "#E3E6E5", blush: "#F0A88E" },
};

const ART: Record<VesselCode, React.ReactNode> = {
  /* 가마솥형 — 크게 걸고 크게 끓인다 (화) */
  SROP: (
    <g>
      {shadow}
      <path d="M48 78 C48 70 70 64 100 64 C130 64 152 70 152 78 C158 100 158 130 148 150 C140 166 122 176 100 176 C78 176 60 166 52 150 C42 130 42 100 48 78 Z" fill={P.화.body} />
      <path d="M48 78 C48 70 70 64 100 64 C130 64 152 70 152 78 C154 86 155 95 155 104 L45 104 C45 95 46 86 48 78 Z" fill={P.화.dark} opacity="0.45" />
      <ellipse cx="100" cy="70" rx="46" ry="11" fill={P.화.dark} />
      <ellipse cx="100" cy="67" rx="40" ry="8" fill={GOLD} />
      <ellipse cx="88" cy="65" rx="10" ry="3" fill={GOLD_HI} />
      <path d="M40 84 C30 84 28 96 38 98" fill="none" stroke={P.화.dark} strokeWidth="9" strokeLinecap="round" />
      <path d="M160 84 C170 84 172 96 162 98" fill="none" stroke={P.화.dark} strokeWidth="9" strokeLinecap="round" />
      <path d="M70 176 L66 188 M100 178 L100 190 M130 176 L134 188" stroke={P.화.dark} strokeWidth="8" strokeLinecap="round" />
      <path d="M78 46 C74 38 82 34 84 42 M100 40 C98 30 108 28 108 38 M122 46 C122 38 130 38 128 46" fill="none" stroke="#D9A05B" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      {face(124, P.화.blush)}
    </g>
  ),

  /* 무쇠솥형 — 늦게 차지만 절대 안 샌다 (금) */
  SROJ: (
    <g>
      {shadow}
      <path d="M46 96 C46 86 70 80 100 80 C130 80 154 86 154 96 C158 116 156 142 146 158 C138 172 120 180 100 180 C80 180 62 172 54 158 C44 142 42 116 46 96 Z" fill={P.금.body} />
      <path d="M46 96 C46 86 70 80 100 80 C130 80 154 86 154 96 L154 106 L46 106 Z" fill={P.금.dark} opacity="0.35" />
      <ellipse cx="100" cy="88" rx="50" ry="10" fill={P.금.dark} />
      <path d="M54 82 C54 72 74 64 100 64 C126 64 146 72 146 82 C146 88 126 92 100 92 C74 92 54 88 54 82 Z" fill={P.금.light} />
      <path d="M92 58 C92 50 108 50 108 58" fill="none" stroke={P.금.dark} strokeWidth="7" strokeLinecap="round" />
      <path d="M120 76 C130 72 142 74 146 80" fill="none" stroke={GOLD} strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      <path d="M38 104 C30 104 28 114 36 116 M162 104 C170 104 172 114 164 116" fill="none" stroke={P.금.dark} strokeWidth="8" strokeLinecap="round" />
      {face(132, P.금.blush)}
    </g>
  ),

  /* 놋그릇형 — 닦을수록 빛나는 큰 그릇 (금) */
  SRXP: (
    <g>
      {shadow}
      <path d="M42 84 C42 76 68 70 100 70 C132 70 158 76 158 84 C158 116 136 142 100 142 C64 142 42 116 42 84 Z" fill="#D9BC7A" />
      <path d="M42 84 C42 76 68 70 100 70 C132 70 158 76 158 84 L158 92 C140 100 60 100 42 92 Z" fill="#B99549" opacity="0.5" />
      <ellipse cx="100" cy="77" rx="52" ry="10" fill="#B99549" />
      <ellipse cx="100" cy="74" rx="45" ry="7" fill={GOLD} />
      <ellipse cx="86" cy="72" rx="11" ry="3" fill={GOLD_HI} />
      <path d="M88 142 L88 156 L112 156 L112 142 Z" fill="#B99549" />
      <path d="M72 160 C72 154 128 154 128 160 L128 168 C128 174 72 174 72 168 Z" fill="#D9BC7A" />
      <path d="M148 52 L152 60 L160 62 L152 66 L150 74 L146 66 L138 64 L146 60 Z" fill={GOLD_HI} />
      {face(104, P.금.blush)}
    </g>
  ),

  /* 금고형 — 모으면 잠근다 (토) */
  SRXJ: (
    <g>
      {shadow}
      <rect x="46" y="58" width="108" height="118" rx="20" fill={P.토.body} />
      <rect x="46" y="58" width="108" height="118" rx="20" fill="none" stroke={P.토.dark} strokeWidth="5" opacity="0.4" />
      <rect x="82" y="52" width="36" height="10" rx="5" fill={P.토.dark} />
      <circle cx="100" cy="142" r="17" fill={P.토.light} />
      <circle cx="100" cy="142" r="17" fill="none" stroke={P.토.dark} strokeWidth="4" />
      <path d="M100 142 L100 131 M100 142 L109 147" stroke={P.토.dark} strokeWidth="4" strokeLinecap="round" />
      <rect x="88" y="70" width="24" height="5" rx="2.5" fill={GOLD} />
      <path d="M62 176 L62 186 M138 176 L138 186" stroke={P.토.dark} strokeWidth="9" strokeLinecap="round" />
      {face(100, P.토.blush)}
    </g>
  ),

  /* 두레박형 — 퍼 올리는 힘은 최고 (수) */
  SrOP: (
    <g>
      {shadow}
      <path d="M58 92 L142 92 L134 172 C133 178 67 178 66 172 Z" fill={P.수.body} />
      <path d="M58 92 L142 92 L140 112 L60 112 Z" fill={P.수.dark} opacity="0.35" />
      <ellipse cx="100" cy="92" rx="42" ry="9" fill={P.수.dark} />
      <ellipse cx="100" cy="89" rx="36" ry="6.5" fill={GOLD} />
      <ellipse cx="89" cy="87" rx="9" ry="2.5" fill={GOLD_HI} />
      <path d="M64 88 C58 46 142 46 136 88" fill="none" stroke="#8A6F4D" strokeWidth="6" strokeLinecap="round" strokeDasharray="1 9" />
      <path d="M96 42 C96 34 106 34 106 42 C106 48 96 48 96 42 Z" fill="#8A6F4D" />
      <path d="M70 132 L130 132 M72 152 L128 152" stroke={P.수.dark} strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      {face(128, P.수.blush)}
    </g>
  ),

  /* 뚝배기형 — 천천히 데워져 오래 안 식는다 (토) */
  SrOJ: (
    <g>
      {shadow}
      <path d="M40 96 C40 88 66 82 100 82 C134 82 160 88 160 96 C160 128 138 158 100 158 C62 158 40 128 40 96 Z" fill="#C98F58" />
      <path d="M40 96 C40 88 66 82 100 82 C134 82 160 88 160 96 L160 104 C140 112 60 112 40 104 Z" fill="#9C6A3C" opacity="0.5" />
      <ellipse cx="100" cy="90" rx="56" ry="11" fill="#9C6A3C" />
      <ellipse cx="100" cy="87" rx="49" ry="8" fill={GOLD} />
      <ellipse cx="84" cy="85" rx="11" ry="3" fill={GOLD_HI} />
      <path d="M34 96 L22 96 M178 96 L166 96" stroke="#9C6A3C" strokeWidth="9" strokeLinecap="round" />
      <path d="M80 62 C76 52 84 48 86 58 M104 56 C102 44 112 42 112 54 M126 64 C126 54 134 54 132 62" fill="none" stroke="#D9A05B" strokeWidth="4" strokeLinecap="round" opacity="0.8" />
      <path d="M74 158 L74 170 L126 170 L126 158" fill="#9C6A3C" />
      {face(118, P.토.blush)}
    </g>
  ),

  /* 표주박형 — 들어올 때 화끈, 나갈 때 더 화끈 (수) */
  SrXP: (
    <g>
      {shadow}
      <path d="M100 30 C112 30 120 40 118 52 C117 60 112 66 108 72 C122 80 132 96 132 118 C132 152 118 176 100 176 C82 176 68 152 68 118 C68 96 78 80 92 72 C88 66 83 60 82 52 C80 40 88 30 100 30 Z" fill={P.수.body} />
      <path d="M92 72 C88 66 83 60 82 52 C80 40 88 30 100 30 C112 30 120 40 118 52 C117 60 112 66 108 72 C104 74 96 74 92 72 Z" fill={P.수.dark} />
      <path d="M70 128 C70 154 82 176 100 176 C118 176 130 154 130 128 C120 136 80 136 70 128 Z" fill={GOLD} />
      <ellipse cx="100" cy="132" rx="28" ry="4" fill={GOLD_HI} />
      <path d="M96 22 C96 16 104 16 104 22 L104 30 L96 30 Z" fill={P.수.dark} />
      {face(108, P.수.blush)}
    </g>
  ),

  /* 옹달샘형 — 마르지 않는 잔잔한 샘 (수) */
  SrXJ: (
    <g>
      {shadow}
      <path d="M44 118 C44 104 68 96 100 96 C132 96 156 104 156 118 C156 144 134 164 100 164 C66 164 44 144 44 118 Z" fill="#A9A29A" />
      <path d="M50 110 a12 10 0 0 1 22 0 M78 104 a12 10 0 0 1 22 0 M106 104 a12 10 0 0 1 22 0 M132 110 a11 9 0 0 1 20 0" fill="#BDB6AD" />
      <ellipse cx="100" cy="112" rx="42" ry="10" fill="#8FB8D8" />
      <ellipse cx="100" cy="110" rx="36" ry="7" fill="#B3D3EA" />
      <ellipse cx="88" cy="108" rx="9" ry="2.5" fill="#DCEDF8" />
      <path d="M124 92 L127 98 L133 100 L127 102 L125 108 L122 102 L116 100 L122 97 Z" fill={GOLD_HI} />
      <path d="M96 100 C97 96 103 96 104 100" fill="none" stroke="#6E98BC" strokeWidth="3" strokeLinecap="round" />
      {face(134, P.수.blush)}
    </g>
  ),

  /* 소쿠리형 — 큰돈이 지나가는 길목의 그릇 (목) */
  WROP: (
    <g>
      {shadow}
      <path d="M38 92 C38 86 66 82 100 82 C134 82 162 86 162 92 C162 122 138 146 100 146 C62 146 38 122 38 92 Z" fill="#C9A46B" />
      <path d="M52 96 C70 130 130 130 148 96 M64 100 C76 126 124 126 136 100 M42 92 L158 92" fill="none" stroke="#A57F44" strokeWidth="4" opacity="0.6" />
      <path d="M60 108 C64 122 136 122 140 108" fill="none" stroke="#A57F44" strokeWidth="4" opacity="0.5" />
      <ellipse cx="100" cy="88" rx="55" ry="9" fill="#A57F44" />
      <circle cx="84" cy="84" r="9" fill={GOLD} />
      <circle cx="104" cy="80" r="9" fill={GOLD_HI} />
      <circle cx="122" cy="85" r="9" fill={GOLD} />
      <path d="M84 84 L84 84 M104 80 L104 80" stroke="#B98A3F" strokeWidth="2" />
      <path d="M74 146 L74 158 L126 158 L126 146" fill="#A57F44" />
      {face(112, P.목.blush)}
    </g>
  ),

  /* 항아리형 — 모으는 건 천재, 여는 게 문제 (토) */
  WROJ: (
    <g>
      {shadow}
      <path d="M62 62 C62 54 78 50 100 50 C122 50 138 54 138 62 C154 76 160 104 154 132 C149 158 128 176 100 176 C72 176 51 158 46 132 C40 104 46 76 62 62 Z" fill={P.토.body} />
      <path d="M62 62 C62 54 78 50 100 50 C122 50 138 54 138 62 C140 66 142 70 144 76 L56 76 C58 70 60 66 62 62 Z" fill={P.토.dark} opacity="0.4" />
      <ellipse cx="100" cy="56" rx="34" ry="8" fill={P.토.dark} />
      <ellipse cx="100" cy="54" rx="28" ry="6" fill={GOLD} />
      <ellipse cx="92" cy="52" rx="7" ry="2" fill={GOLD_HI} />
      <path d="M56 148 C70 156 130 156 144 148" fill="none" stroke={P.토.dark} strokeWidth="4" strokeLinecap="round" opacity="0.4" />
      {face(110, P.토.blush)}
    </g>
  ),

  /* 유리병형 — 안이 다 보이는 투명한 그릇 (금) */
  WRXP: (
    <g>
      {shadow}
      <path d="M84 60 L84 76 C68 86 60 102 60 124 C60 156 76 176 100 176 C124 176 140 156 140 124 C140 102 132 86 116 76 L116 60 Z" fill="#DDEBEE" opacity="0.85" />
      <path d="M84 60 L84 76 C68 86 60 102 60 124 C60 156 76 176 100 176 C124 176 140 156 140 124 C140 102 132 86 116 76 L116 60 Z" fill="none" stroke="#9FBCC2" strokeWidth="5" />
      <path d="M64 132 C64 158 80 176 100 176 C120 176 136 158 136 132 C124 140 76 140 64 132 Z" fill={GOLD} />
      <ellipse cx="100" cy="135" rx="30" ry="4" fill={GOLD_HI} />
      <rect x="80" y="46" width="40" height="16" rx="6" fill="#C9A46B" />
      <path d="M72 92 C68 100 66 108 66 116" fill="none" stroke="#FFFFFF" strokeWidth="5" strokeLinecap="round" opacity="0.8" />
      {face(110, P.금.blush)}
    </g>
  ),

  /* 장독형 — 묵혀야 제맛이 드는 그릇 (목) */
  WRXJ: (
    <g>
      {shadow}
      <path d="M60 78 C60 72 76 68 100 68 C124 68 140 72 140 78 C152 94 156 118 151 140 C146 162 126 176 100 176 C74 176 54 162 49 140 C44 118 48 94 60 78 Z" fill="#8FA98A" />
      <path d="M52 60 C60 46 140 46 148 60 L142 72 C130 64 70 64 58 72 Z" fill="#6E8A69" />
      <path d="M92 42 C92 36 108 36 108 42 L106 48 L94 48 Z" fill="#5E7859" />
      <path d="M52 120 C70 128 130 128 148 120" fill="none" stroke="#6E8A69" strokeWidth="4" strokeLinecap="round" opacity="0.6" />
      <path d="M56 144 C72 152 128 152 144 144" fill="none" stroke="#6E8A69" strokeWidth="4" strokeLinecap="round" opacity="0.5" />
      {face(100, P.목.blush)}
    </g>
  ),

  /* 화로형 — 돈을 데우는 재주 (화) */
  WrOP: (
    <g>
      {shadow}
      <path d="M44 96 C44 88 70 84 100 84 C130 84 156 88 156 96 C156 124 136 148 100 148 C64 148 44 124 44 96 Z" fill="#8A6455" />
      <ellipse cx="100" cy="92" rx="52" ry="10" fill="#6E4C40" />
      <path d="M84 84 C82 70 92 66 92 76 C96 62 108 62 108 74 C110 64 120 68 116 80 C114 86 88 88 84 84 Z" fill="#F0925C" />
      <path d="M94 80 C93 72 100 70 100 77 C102 70 108 72 106 80 C104 84 96 84 94 80 Z" fill={GOLD_HI} />
      <path d="M36 100 L24 96 M164 100 L176 96" stroke="#6E4C40" strokeWidth="8" strokeLinecap="round" />
      <path d="M66 148 L60 166 M100 150 L100 168 M134 148 L140 166" stroke="#6E4C40" strokeWidth="8" strokeLinecap="round" />
      {face(112, P.화.blush)}
    </g>
  ),

  /* 종지형 — 작지만 매일 채워지는 그릇 (목) */
  WrOJ: (
    <g>
      {shadow}
      <path d="M62 116 C62 110 80 106 100 106 C120 106 138 110 138 116 C138 138 124 154 100 154 C76 154 62 138 62 116 Z" fill={P.목.body} />
      <ellipse cx="100" cy="112" rx="36" ry="8" fill={P.목.dark} />
      <ellipse cx="100" cy="110" rx="30" ry="6" fill={GOLD} />
      <ellipse cx="92" cy="108" rx="7" ry="2" fill={GOLD_HI} />
      <path d="M82 154 L82 162 L118 162 L118 154" fill={P.목.dark} />
      <path d="M100 92 C100 84 108 82 108 90 M100 92 C100 82 92 80 92 88" fill="none" stroke={GOLD} strokeWidth="4" strokeLinecap="round" />
      <circle cx="100" cy="78" r="6" fill={GOLD_HI} />
      {face(128, P.목.blush)}
    </g>
  ),

  /* 대접형 — 남부터 담아주는 넉넉한 그릇 (화) */
  WrXP: (
    <g>
      {shadow}
      <path d="M34 94 C34 88 64 84 100 84 C136 84 166 88 166 94 C166 126 140 152 100 152 C60 152 34 126 34 94 Z" fill={P.화.body} />
      <path d="M34 94 C34 88 64 84 100 84 C136 84 166 88 166 94 L166 100 C144 108 56 108 34 100 Z" fill={P.화.dark} opacity="0.4" />
      <ellipse cx="100" cy="90" rx="60" ry="10" fill={P.화.dark} />
      <ellipse cx="100" cy="87" rx="53" ry="7.5" fill={GOLD} />
      <ellipse cx="82" cy="85" rx="12" ry="2.5" fill={GOLD_HI} />
      <path d="M78 152 L78 164 L122 164 L122 152" fill={P.화.dark} />
      <path d="M144 66 C150 60 158 64 154 70 M156 76 C164 74 166 82 160 82" fill="none" stroke={GOLD} strokeWidth="4" strokeLinecap="round" opacity="0.9" />
      {face(116, P.화.blush)}
    </g>
  ),

  /* 달항아리형 — 비어 보여도 값은 최고 (금) */
  WrXJ: (
    <g>
      {shadow}
      <circle cx="100" cy="122" r="58" fill="#F7F4EE" />
      <circle cx="100" cy="122" r="58" fill="none" stroke="#DDD6CA" strokeWidth="4" />
      <path d="M80 64 C80 58 88 54 100 54 C112 54 120 58 120 64 C120 68 112 71 100 71 C88 71 80 68 80 64 Z" fill="#E9E4DA" />
      <ellipse cx="100" cy="62" rx="14" ry="4" fill="#CFC7B8" />
      <path d="M74 92 C68 100 64 110 64 120" fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" opacity="0.9" />
      <path d="M138 82 L141 88 L147 90 L141 92 L139 98 L136 92 L130 90 L136 88 Z" fill={GOLD_HI} />
      {face(118, "#EFC8B8", true)}
    </g>
  ),
};

export function VesselCharacter({ code, size = 160 }: { code: VesselCode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" role="img" aria-label="재물그릇 캐릭터">
      {ART[code]}
    </svg>
  );
}
