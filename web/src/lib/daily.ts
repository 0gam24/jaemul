import { getSaju, type ManseInput } from "./manseryeok";
import { TENGOD_LABEL } from "./reading";

/**
 * 오늘의 재물운 (M4 — 무료·LLM 미사용·원가 0원)
 *
 * 오늘의 일진(일주 간지)을 독립 공식(율리우스일)으로 계산하고,
 * 사용자 일간과의 십성 관계 → 쉬운 말 별명 → 고정 템플릿으로 문장을 만든다.
 * 일주 공식은 tests/manseryeok.test.ts에서 20케이스 교차 검증된 것과 동일 앵커
 * (2000-01-01 = 戊午, (JDN+49) mod 60 = 54).
 */

const STEMS = ["甲", "乙", "丙", "丁", "戊", "己", "庚", "辛", "壬", "癸"] as const;
const BRANCHES = ["子", "丑", "寅", "卯", "辰", "巳", "午", "未", "申", "酉", "戌", "亥"] as const;

/** 지지 본기(주 지장간) — 십성 판정용 */
const BRANCH_MAIN_STEM: Record<string, string> = {
  子: "癸", 丑: "己", 寅: "甲", 卯: "乙", 辰: "戊", 巳: "丙",
  午: "丁", 未: "己", 申: "庚", 酉: "辛", 戌: "戊", 亥: "壬",
};

function jdn(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

/** 해당 날짜의 일진 간지 (야자시 무관 — 날짜 단위) */
export function dayGanzhiOf(date: Date): { stem: string; branch: string; ganzhi: string } {
  const i = ((jdn(date.getFullYear(), date.getMonth() + 1, date.getDate()) + 49) % 60 + 60) % 60;
  const stem = STEMS[i % 10];
  const branch = BRANCHES[i % 12];
  return { stem, branch, ganzhi: stem + branch };
}

/** 일간(나) 기준 상대 천간의 십성 — 오행 생극 + 음양 */
export function tenGodOf(myStem: string, otherStem: string): string {
  const me = STEMS.indexOf(myStem as (typeof STEMS)[number]);
  const ot = STEMS.indexOf(otherStem as (typeof STEMS)[number]);
  if (me < 0 || ot < 0) return "";
  const myEl = Math.floor(me / 2), otEl = Math.floor(ot / 2);
  const same = me % 2 === ot % 2; // 같은 음양 → 편(偏) 계열
  if (otEl === myEl) return same ? "비견" : "겁재";
  if ((myEl + 1) % 5 === otEl) return same ? "식신" : "상관"; // 내가 생함
  if ((myEl + 2) % 5 === otEl) return same ? "편재" : "정재"; // 내가 극함 = 재성
  if ((otEl + 2) % 5 === myEl) return same ? "편관" : "정관"; // 나를 극함
  return same ? "편인" : "정인"; // 나를 생함
}

export type DailyFortune = {
  /** 표시용 날짜 */
  year: number;
  month: number;
  day: number;
  /** 오늘 일진 (근거 도장) */
  ganzhi: string;
  /** 십성 (천간/지지 본기) */
  stemGod: string;
  branchGod: string;
  /** 쉬운 말 별명 — 오늘의 주인공 기운 */
  label: string;
  /** 1=지갑 잠그는 날, 2=흐름 다지는 날, 3=돈길 열리는 날 */
  level: 1 | 2 | 3;
  levelName: string;
  message: string;
  tip: string;
  /** 다음 level-3 날까지 남은 일수 (오늘 포함 14일 내, 없으면 null) — 재방문 훅 */
  nextGoodInDays: number | null;
};

const WEALTH = new Set(["정재", "편재"]);
const OUTPUT = new Set(["식신", "상관"]);
const RIVAL = new Set(["비견", "겁재"]);

const LEVEL_NAME: Record<number, string> = { 1: "지갑 잠그는 날", 2: "흐름 다지는 날", 3: "돈길 열리는 날" };

/** 기운별 고정 템플릿 — 절대규칙 1(보장·단정 금지), 부정은 3단 리프레이밍 */
const TEMPLATES: Record<string, { message: string; tip: string }> = {
  정재: { message: "성실하게 굴려온 것이 티가 나는 날이에요. 꾸준함이 곧 실력으로 보입니다.", tip: "미뤄둔 정산·청구·환급 오늘 처리하기" },
  편재: { message: "뜻밖의 제안이나 정보가 굴러들어올 수 있는 날이에요. 눈과 귀를 열어두세요.", tip: "들어온 제안은 메모만 — 결정은 하루 재우기" },
  식신: { message: "내 재주를 보여줄수록 돈과 가까워지는 날이에요. 숨기면 아무 일도 안 생겨요.", tip: "결과물 하나 공개하기 — 후기·포트폴리오·제안" },
  상관: { message: "내 재주를 보여줄수록 돈과 가까워지는 날이에요. 숨기면 아무 일도 안 생겨요.", tip: "결과물 하나 공개하기 — 후기·포트폴리오·제안" },
  정인: { message: "오늘 배운 것이 나중에 돈으로 돌아오는 날이에요. 지금은 채우는 시간입니다.", tip: "돈 되는 공부 30분 — 강의·책·자격 알아보기" },
  편인: { message: "오늘 배운 것이 나중에 돈으로 돌아오는 날이에요. 지금은 채우는 시간입니다.", tip: "돈 되는 공부 30분 — 강의·책·자격 알아보기" },
  정관: { message: "맡은 일을 단단히 해내면 평판이 쌓이는 날이에요. 평판은 느리지만 확실한 자산입니다.", tip: "약속·마감 하나를 오늘 확실하게 끝내기" },
  편관: { message: "맡은 일을 단단히 해내면 평판이 쌓이는 날이에요. 평판은 느리지만 확실한 자산입니다.", tip: "약속·마감 하나를 오늘 확실하게 끝내기" },
  비견: { message: "사람에게 지갑이 열리기 쉬운 날이에요. 마음은 열되 한도는 정해두세요.", tip: "모임 나가기 전, 오늘 쓸 상한선 정하기" },
  겁재: { message: "사람에게 지갑이 열리기 쉬운 날이에요. 마음은 열되 한도는 정해두세요.", tip: "모임 나가기 전, 오늘 쓸 상한선 정하기" },
};

const GONGMANG_TEMPLATE = {
  message: "서두를수록 헛도는 날이에요. 애쓴 만큼 안 돌아온다고 느껴지면, 오늘이 그런 날이라서예요. 결정 대신 정리를 하기 좋은 날입니다.",
  tip: "큰 지출·계약 결정은 내일로 미루기",
};

/** level 3(돈길 열리는 날) 전용 — 배지와 메시지 톤이 항상 일치하도록 별도 세트 */
const TEMPLATES_L3: Record<string, { message: string; tip: string }> = {
  정재: { message: "꾸준히 굴려온 것이 값을 인정받기 좋은 날이에요. 미뤄둔 돈 이야기를 꺼내보세요.", tip: "정산·청구·수입 조건 이야기, 오늘 꺼내기" },
  편재: { message: "기회형 돈이 크게 도는 날이에요. 들어오는 제안과 정보에 눈과 귀를 활짝 여세요.", tip: "제안·정보에 답장하고 조건 물어보기" },
  식신: { message: "재주가 돈으로 이어지기 쉬운 날이에요. 보여줄수록 좋습니다.", tip: "결과물 공개·제안서 보내기, 오늘 하나" },
  상관: { message: "재주가 돈으로 이어지기 쉬운 날이에요. 보여줄수록 좋습니다.", tip: "결과물 공개·제안서 보내기, 오늘 하나" },
  정인: { message: "배움이 돈길로 이어지는 날이에요. 오늘 알아본 것이 다음 수입의 씨앗이 됩니다.", tip: "관심 있던 강의·자격, 오늘 등록까지 가보기" },
  편인: { message: "배움이 돈길로 이어지는 날이에요. 오늘 알아본 것이 다음 수입의 씨앗이 됩니다.", tip: "관심 있던 강의·자격, 오늘 등록까지 가보기" },
  정관: { message: "성실함이 눈에 띄는 날이에요. 좋은 평가가 돈으로 이어지기 쉽습니다.", tip: "성과를 정리해서 보고·공유하기" },
  편관: { message: "성실함이 눈에 띄는 날이에요. 좋은 평가가 돈으로 이어지기 쉽습니다.", tip: "성과를 정리해서 보고·공유하기" },
  비견: { message: "사람이 기회를 물어다 주기 쉬운 날이에요. 만남에서 돈 이야기가 나올 수 있어요.", tip: "미뤄둔 연락 한 통 돌리기" },
  겁재: { message: "사람이 기회를 물어다 주기 쉬운 날이에요. 만남에서 돈 이야기가 나올 수 있어요.", tip: "미뤄둔 연락 한 통 돌리기" },
};

function scoreDay(
  stemGod: string, branchGod: string,
  stem: string, branch: string,
  yongsin: Set<string>, gongmang: Set<string>
): number {
  let score = 0;
  if (WEALTH.has(stemGod) || WEALTH.has(branchGod)) score += 2;
  if (yongsin.has(stem)) score += 2;
  if (OUTPUT.has(branchGod)) score += 1;
  if (gongmang.has(branch)) score -= 2;
  if (RIVAL.has(stemGod)) score -= 2;
  return score;
}

/** 오늘의 재물운 — 전부 결정적(같은 사주·같은 날짜 → 같은 결과) */
export function dailyFortune(input: ManseInput, date: Date): DailyFortune {
  const { saju } = getSaju(input);
  const myStem = saju.pillarDetails.day.stem;
  const yongsin = new Set(saju.advanced.yongsin);
  const gongmang = new Set(saju.gongmang.branches);

  const compute = (d: Date) => {
    const g = dayGanzhiOf(d);
    const stemGod = tenGodOf(myStem, g.stem);
    const branchGod = tenGodOf(myStem, BRANCH_MAIN_STEM[g.branch]);
    const score = scoreDay(stemGod, branchGod, g.stem, g.branch, yongsin, gongmang);
    const isGongmang = gongmang.has(g.branch);
    // 공망일은 '돈길 열리는 날'이 될 수 없다 — 배지·메시지·다음 돈길 안내가 항상 일관되도록 클램프
    let level: 1 | 2 | 3 = score >= 2 ? 3 : score <= -2 ? 1 : 2;
    if (isGongmang && level === 3) level = 2;
    return { g, stemGod, branchGod, level, isGongmang };
  };

  const today = compute(date);

  // 재방문 훅 — 다음 "돈길 열리는 날"이 며칠 뒤인지 (내일부터 14일)
  let nextGoodInDays: number | null = null;
  for (let i = 1; i <= 14; i++) {
    const d = new Date(date.getFullYear(), date.getMonth(), date.getDate() + i);
    if (compute(d).level === 3) { nextGoodInDays = i; break; }
  }

  const primaryGod = today.stemGod || today.branchGod;
  // 메시지 세트는 level 우선: 3=긍정 행동, 공망=정리 권유, 그 외=기운별 기본
  const base = today.isGongmang
    ? GONGMANG_TEMPLATE
    : today.level === 3
      ? (TEMPLATES_L3[primaryGod] ?? TEMPLATES_L3["정재"])
      : (TEMPLATES[primaryGod] ?? TEMPLATES["정재"]);
  const label = today.isGongmang
    ? "헛도는 자리"
    : (TENGOD_LABEL[today.stemGod] ?? TENGOD_LABEL[today.branchGod] ?? "흐름 유지");

  const message = today.level === 1 && !today.isGongmang
    ? `오늘은 아끼는 게 버는 거예요. ${base.message}`
    : base.message;

  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    ganzhi: today.g.ganzhi,
    stemGod: today.stemGod,
    branchGod: today.branchGod,
    label,
    level: today.level,
    levelName: LEVEL_NAME[today.level],
    message,
    tip: base.tip,
    nextGoodInDays,
  };
}
