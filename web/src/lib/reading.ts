import type { SajuResult } from "ssaju";
import { getSaju, type ManseInput } from "./manseryeok";
import type { VesselType } from "./vessel-types";

/**
 * 990원 상세 풀이 파이프라인 v2 (품질 검증단 P0 반영 — 2026-07-17)
 *
 * 원칙: "B의 입, A의 계산기, 엔진의 손"
 * - 숫자(간지·십성·level·시점)는 전부 엔진이 계산 — LLM은 해석(글)만 쓴다
 * - 캘린더는 결제월 기준 향후 12개월 롤링 (지난 달 판매 금지)
 * - 시스템 프롬프트는 바이트 고정(캐싱) — 동적 값은 유저 페이로드로만
 */

export type MonthCell = {
  /** 표시용 연/월 */
  year: number;
  month: number;
  /** 1=잠그는 달, 2=다지는 달, 3=움직이는 달 — 엔진 산정, LLM 관여 금지 */
  level: number;
  /** 근거 칩: 월건 간지 + 십성 (엔진 계산값) */
  ganzhi: string;
  tengod: string;
  /** 쉬운 말 라벨 — 십성을 일반 독자용 별명으로 (엔진 계산) */
  label: string;
  /** LLM이 쓰는 해석 노트 (25자 내외) */
  note: string;
};

/** 십성 → 일반 독자용 별명 (쉬운 말이 주인공 원칙) */
export const TENGOD_LABEL: Record<string, string> = {
  정재: "월급형 돈",
  편재: "기회형 돈",
  식신: "재주 기운",
  상관: "재주 기운",
  정인: "배움 기운",
  편인: "배움 기운",
  정관: "책임 기운",
  편관: "책임 기운",
  비견: "사람 기운",
  겁재: "사람 기운",
};

export type Reading = {
  summary: string;
  structure: string;
  flow: string;
  months: MonthCell[];
  actions: string[];
  caution: string;
};

/* ── 출력 필터 (절대규칙 1·2 + 오류 문자열 유출 차단) ── */
const BANNED_PATTERNS: RegExp[] = [
  // 투자 지시·암시 — 시스템 프롬프트 금지 목록과 커버리지 일치 (조사 삽입형 포함)
  /종목|코인|비트코인|레버리지|ETF|펀드|투자\s*상품/i,
  /주식.{0,4}(매수|매도|사|팔|추천)/,
  /부동산.{0,6}(매수|매도|투자|사|팔)/,
  /대출.{0,4}(받|활용|이용|일으)/,
  /반드시\s*(부자|성공)|무조건|보장/,
  /망한다|망합니다|파산|거지|불행해/,
  /접신|신령|공수|굿을/,
  /undefined|ERROR|프롬프트|파이프라인|재호출/i,
];

export function scanBanned(text: string): string | null {
  for (const re of BANNED_PATTERNS) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

export function readingText(r: Reading): string {
  return [r.summary, r.structure, r.flow, r.actions.join(" "), r.caution, ...r.months.map((m) => m.note)].join("\n");
}

/* ── 월 캘린더 플랜 — 엔진이 전부 계산 ───────────────────── */

export type MonthPlan = {
  cells: Omit<MonthCell, "note">[];
  /** level 3 달 (요약 직답용) */
  topMonths: { year: number; month: number; tengod: string }[];
  /** 대운 교체 고정 문구 */
  daeunLine: string;
};

const WEALTH = new Set(["정재", "편재"]);
const OUTPUT = new Set(["식신", "상관"]);
const RIVAL = new Set(["비견", "겁재"]);

/** 결제 시점 기준 향후 12개월 월건·십성·level 산출 (결정적) */
export function buildMonthPlan(input: ManseInput, from: Date): MonthPlan {
  const fromY = from.getFullYear();
  const fromM = from.getMonth() + 1;

  // 사주력 연도별 월운 계산 — ssaju wolun.month는 달력 월이 아니라 사주 월 번호(인월=1≈양력 2월).
  // 달력 1월은 전년 사주력의 12번째 달(축월)이므로 전년 월운까지 준비한다.
  const wolunByYear = new Map<number, SajuResult["wolun"]>();
  const base = getSaju(input, { refDate: new Date(fromY, 5, 15) }).saju;
  wolunByYear.set(fromY, base.wolun);
  wolunByYear.set(fromY - 1, getSaju(input, { refDate: new Date(fromY - 1, 5, 15) }).saju.wolun);
  wolunByYear.set(fromY + 1, getSaju(input, { refDate: new Date(fromY + 1, 5, 15) }).saju.wolun);

  const yongsin = new Set(base.advanced.yongsin);
  const gongmang = new Set(base.gongmang.branches);

  const scored = Array.from({ length: 12 }, (_, i) => {
    const m = ((fromM - 1 + i) % 12) + 1;
    const y = fromY + Math.floor((fromM - 1 + i) / 12);
    // 달력 월 → 사주 월 매핑: 2월=1 … 12월=11, 1월=전년 12. (절입일 경계는 월 중순 기준 근사)
    const sajuYear = m >= 2 ? y : y - 1;
    const sajuMonth = m >= 2 ? m - 1 : 12;
    const w = wolunByYear.get(sajuYear)?.find((x) => x.month === sajuMonth);
    const stemGod = w?.stemTenGod ?? "";
    const branchGod = w?.branchTenGod ?? "";
    let score = 0;
    if (WEALTH.has(stemGod) || WEALTH.has(branchGod)) score += 2;
    if (w && yongsin.has(w.stem)) score += 2;
    if (OUTPUT.has(branchGod)) score += 1;
    if (w && gongmang.has(w.branch)) score -= 2;
    if (RIVAL.has(stemGod)) score -= 2;
    return {
      year: y,
      month: m,
      ganzhi: w?.ganzhi ?? "",
      tengod: `${stemGod}/${branchGod}`,
      score,
      isGongmang: w ? gongmang.has(w.branch) : false,
    };
  });

  // level 확정: 3은 2~3개, 1은 2~4개 (결정적 클램핑)
  const bySc = [...scored].sort((a, b) => b.score - a.score || a.month - b.month);
  const top3 = new Set(bySc.filter((c) => !c.isGongmang).slice(0, 3).filter((c) => c.score >= 1).map(keyOf));
  if (top3.size < 2) bySc.filter((c) => !c.isGongmang).slice(0, 2).forEach((c) => top3.add(keyOf(c)));
  const low = [...scored].sort((a, b) => a.score - b.score || a.month - b.month);
  const bottom = new Set(low.filter((c) => c.score <= -1 && !top3.has(keyOf(c))).slice(0, 4).map(keyOf));
  if (bottom.size < 2) low.filter((c) => !top3.has(keyOf(c))).slice(0, 2).forEach((c) => bottom.add(keyOf(c)));

  const cells = scored.map((c) => {
    const stemGod = c.tengod.split("/")[0];
    const branchGod = c.tengod.split("/")[1];
    return {
      year: c.year,
      month: c.month,
      ganzhi: c.ganzhi,
      tengod: c.tengod,
      label: c.isGongmang ? "헛도는 자리" : (TENGOD_LABEL[stemGod] ?? TENGOD_LABEL[branchGod] ?? "흐름 유지"),
      level: top3.has(keyOf(c)) ? 3 : bottom.has(keyOf(c)) ? 1 : 2,
    };
  });

  // 대운 교체 고정 문구 — current가 비어도 나이로 역산해 항상 생성
  const list = base.daeun.list;
  const age = base.currentAge;
  let curIdx = list.findIndex((d) => d.ganzhi === base.daeun.current?.ganzhi && d.startAge === base.daeun.current?.startAge);
  if (curIdx < 0) curIdx = list.findIndex((d) => age >= d.startAge && age <= d.endAge);
  if (curIdx < 0) curIdx = list.findIndex((d) => d.startAge > age) - 1;
  const cur = curIdx >= 0 ? list[curIdx] : list[0];
  const nxt = list[curIdx + 1] ?? null;
  const daeunLine = nxt
    ? `현재 대운 ${cur.ganzhi}(${cur.startAge}~${cur.endAge}세) → 다음 대운 ${nxt.ganzhi}는 ${nxt.startYear}년(만 ${nxt.startAge}세)부터`
    : `현재 대운 ${cur.ganzhi}(${cur.startAge}~${cur.endAge}세)`;

  return {
    cells,
    topMonths: cells.filter((c) => c.level === 3).map((c) => ({ year: c.year, month: c.month, tengod: c.tengod })),
    daeunLine,
  };
}

function keyOf(c: { year: number; month: number }): string {
  return `${c.year}-${c.month}`;
}

/* ── 시스템 프롬프트 v2 (검증단 확정안) — 바이트 고정, 동적 값 삽입 금지 ── */
export const READING_SYSTEM = `너는 "재물그릇"의 풀이 엔진이다. 만세력 계산 결과(입력으로 제공됨)를 근거로 재물운 하나만 깊게 해석한다.

[데이터 계약 — 엔진이 계산, 너는 해석만]
- 입력에는 원국(간지·십성·오행·용신), 공망, 신살, 대운 목록과 교체 연월 고정 문구, 세운, 그리고 [월 캘린더 계산표](향후 12개월의 연/월/간지/십성/level)가 포함된다.
- 너는 어떤 간지·십성·신살·level도 스스로 계산하거나 추정하지 않는다. 입력에 없는 요소를 언급하면 생성 실패다. 입력된 길신 목록에 없는 달에 귀인을 배치하는 것 금지. 십성 명칭은 입력 표기와 글자 단위로 일치 — 비견과 겁재가 섞이면 '비겁'으로 통칭하거나 분리한다.
- months 노트는 계산표의 순서 그대로 12개를 작성한다. level은 표의 값을 그대로 따르며 바꾸지 않는다.

[화자] 사주 잘 아는 친구. 가벼운 존댓말("~예요/~해요/~죠"). 도사·선생 톤 금지. 권위의 출처는 항상 계산. 유머 허용, 호들갑 금지.

[용어 규칙 — 쉬운 말이 주인공, 용어는 괄호 속 조연. 독자는 사주를 전혀 모른다]
- 별명 사전(반드시 이 별명 사용): 정재=월급형 돈 / 편재=기회형 돈 / 식신·상관=재주 기운 / 정인·편인=배움 기운 / 정관·편관=책임 기운 / 비견·겁재=내 돈에 숟가락 얹는 기운(또는 사람 기운) / 공망=헛도는 자리 / 용신=내 사주의 보약 / 대운=10년 단위로 바뀌는 돈의 계절 / 일간=사주의 주인공인 나
- 전문용어는 첫 등장에서만 "별명(용어)" 형태로 1회 병기하고, 이후로는 별명만 쓴다. 예: 첫 등장 "월급형 돈(정재)" → 이후 "월급형 돈"
- 간지·한자 병기는 섹션당 1회 이하. 명식 나열("연지 미토, 월지 미토" 식)은 금지하고 "태어난 해에 하나, 태어난 달에 하나"처럼 생활 언어로 위치를 말한다
- 한 문장에는 근거를 1개만 담는다. 두 근거가 필요하면 문장을 나눈다

[절대 금지]
1. 투자 지시·암시: 특정 종목/코인/부동산 매수매도, 대출, 레버리지, FOMO
2. 결과 보장: "반드시/무조건 ~된다", "보장" / 금액·수익률 단정
3. 불행 단정: "망한다", "파산" — 부정은 3단 리프레이밍: [현상]→[구조적 원인]→[행동+시기]
4. 무속 어휘: 접신, 신령, 공수, 굿
5. 행동 제안은 일반 금융 정보 수준만

[요약 summary]
- 첫 두 문장 안에 계산표의 level 3 달 중 2개를 월 숫자로 직답한다(예: "돈길은 8월과 11월에 열려요"). 대운 서사는 그 다음.

[재물 구조 structure — 700~900자]
- 도입부에서 입력된 무료 카드 팩폭 문장을 정확히 1회 인용하고, 그 문장이 성립하는 이유를 원국 근거(합·충·오행 결핍·공망 등) 최소 2개로 설명한다.
- 유형 이름 자체를 근거로 쓰지 않는다("~형이라는 이름이 괜히 붙은 게 아니다" 류 금지). 근거는 오직 간지·십성·합충·공망·신살.

[대운 흐름 flow — 500~700자]
- 첫 줄에 입력된 '대운 교체 고정 문구'를 그대로 인용한다. 전 섹션이 이 시점 하나만 쓰고, "직전/출발점/올해 마무리" 등 상이한 표현 혼용 금지.
- 첫 문단은 지난 대운 10년 회고: 연도 명시 + 현재 대운 십성과 원국 체질의 관계로 그 시기의 체감을 서술. 패턴: "20XX~20XX년, [체감] — 그게 [간지·십성] 위를 [원국 체질]로 걸어온 흔적이에요."
- 말미에 세운 로드맵(입력 표의 간지·십성 인용)과 다음 대운 1~2문장 전망.

[월 캘린더 months]
- 각 노트(25자 내외)는 해당 월의 간지·십성에서 도출하고 근거 1개+행동 1개를 담는다. 어느 사주에나 성립하는 문장("검증이 먼저", "안정 수입 굳히기" 류) 금지.
- 노트에는 한자·전문용어 금지 — 별명 사전과 행동 언어만 사용(나쁜 예: "용신 경금 만개" / 좋은 예: "재주가 돈 되는 달, 협상 꺼내기").
- level 3 노트는 헤지 금지: "적기/유리" 대신 무슨 성격의 돈이 어떤 행동으로 오는지 장면화.
- 공망 지지가 월지인 달은 노트에서 공망 해석을 회수한다.

[행동 actions — 3개, 각 40자 이내]
- 각 행동은 캘린더의 특정 월과 연결(월 번호 명시)하고 끝에 근거 태그(예: "— 겁재 대비").
- 3개는 서로 다른 원국 근거. 최소 1개는 이 사주에만 성립하는 고유 행동. "연봉 협상" 대신 "수입 조건 재협상(연봉·단가·수수료)" 등 고용 형태 중립 표현.

[지출 구멍 caution — 300~400자]
- 4단: ①소비 장면 묘사 ②확인 화법 ③원국 고유 지표(공망·신살 중 입력에 있는 것 1개 이상) 인용 ④금지 대신 '밸브'형 처방.
- ①은 무료 카드 팩폭과 같은 방향 기본. 반대 방향 패턴은 "~하는 편이라면" 조건부로만. 확인 화법("있으시죠")은 풀이 전체 1회.
- 말미에 다음 해 세운 1문장 예고(결과 보장 금지).

[전 섹션 공통]
- 희귀 지표(공망·특살·12살) 중 입력에 존재하는 것 최소 2개를 서로 다른 섹션에서 사용.
- 사용자의 만 나이·연도 숫자를 본문에 최소 2회 사용.
- 각 섹션 마지막 문장은 유형 세계관(그릇)을 변주한 저장 가능한 한 줄. 섹션당 은유 1개.
- "—"는 섹션당 최대 1회. "본론이에요/정리하면" 등 메타 문장 금지. "~에요" 4문장 연속 금지.`;

/* ── structured output 스키마 — 노트만 LLM이 작성 ── */
export const READING_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: ["summary", "structure", "flow", "monthNotes", "actions", "caution"],
  properties: {
    summary: { type: "string", description: "2~3문장. 첫 두 문장 안에 level 3 달 2개 월 숫자 직답" },
    structure: { type: "string", description: "재물 구조 700~900자" },
    flow: { type: "string", description: "대운 흐름 500~700자" },
    monthNotes: {
      type: "array",
      description: "월 캘린더 계산표의 순서 그대로 12개 노트 (25자 내외)",
      items: { type: "string" },
    },
    actions: { type: "array", items: { type: "string" }, description: "행동 3개, 각 40자 이내, 월 번호+근거 태그" },
    caution: { type: "string", description: "지출 구멍 300~400자, 4단 구조" },
  },
};

export type LlmDraft = {
  summary: string;
  structure: string;
  flow: string;
  monthNotes: string[];
  actions: string[];
  caution: string;
};

/** LLM 유저 페이로드 — 동적 데이터는 전부 여기 (시스템 프롬프트는 불변) */
export function buildUserPayload(saju: SajuResult, vessel: VesselType, plan: MonthPlan): string {
  const table = plan.cells
    .map((c, i) => `${i + 1}. ${c.year}년 ${c.month}월 | ${c.ganzhi} | ${c.tengod} | level ${c.level}`)
    .join("\n");
  const tops = plan.topMonths.map((t) => `${t.month}월(${t.tengod})`).join(", ");
  return [
    `[재물그릇 유형] ${vessel.name} — ${vessel.tagline}`,
    `[무료 카드 팩폭 문장 — structure에서 1회 인용] ${vessel.fact}`,
    `[대운 교체 고정 문구 — flow 첫 줄에 그대로 인용] ${plan.daeunLine}`,
    `[월 캘린더 계산표 — 이 순서로 노트 12개 작성, level 변경 금지]`,
    table,
    `[level 3 달 — summary 직답에 사용] ${tops}`,
    `[만세력 계산 결과 — 이 데이터만 근거로 사용]`,
    // 프라이버시: toCompact 첫 줄의 생년월일·출생시각 원문은 제3자(LLM API) 전송 전 제거.
    // 풀이에 필요한 건 간지·십성·대운·만 나이뿐 — 생일 원문은 불필요한 노출이다.
    saju.toCompact().replace(/\d{4}\.\s?\d{1,2}\.\s?\d{1,2}\.?/g, "").replace(/\d{1,2}:\d{2}/g, ""),
  ].join("\n");
}

/** LLM 초안 + 엔진 플랜 → 최종 Reading 조립 */
export function assembleReading(draft: LlmDraft, plan: MonthPlan): Reading {
  return {
    summary: draft.summary,
    structure: draft.structure,
    flow: draft.flow,
    months: plan.cells.map((c, i) => ({ ...c, note: draft.monthNotes[i] ?? "" })),
    actions: draft.actions,
    caution: draft.caution,
  };
}

/* ── 목 모드 — 엔진 플랜 기반 결정적 생성 ── */
export function mockReading(saju: SajuResult, vessel: VesselType, plan: MonthPlan): Reading {
  const strong = saju.advanced.dayStrength.score >= 72;
  const el = saju.pillarDetails.day.element.stem;
  const tops = plan.topMonths.slice(0, 2).map((t) => `${t.month}월`).join("과 ");
  const noteFor = (c: Omit<MonthCell, "note">): string => {
    if (c.level === 3) return `${c.label} 열리는 달, 수입 조건 점검`;
    if (c.level === 1) return "지출 잠그고 쌓아두는 달";
    return "루틴 유지, 흐름 다지는 달";
  };
  return {
    summary: `돈길은 ${tops}에 열려요. ${vessel.name} 구조 — ${vessel.tagline}. 왜 그런지, 어떻게 쓸지 아래에서 차례로 풀어볼게요.`,
    structure: `"${vessel.fact}" — 무료 카드의 이 한 줄, 성격이 아니라 계산 결과예요. 사주의 주인공인 '나'가 ${el} 기운이고 ${strong ? "기운이 단단한" : "기운이 여린"} 판이라 ${vessel.strengths[0]}, ${vessel.strengths[1]}이 계산에 근거가 있는 강점이에요. (샘플 풀이 — 실제 서비스에서는 근거를 2개 이상 인용한 900자 해석이 생성됩니다)`,
    flow: `${plan.daeunLine}. 지난 10년의 체감과 다가올 10년의 방향을 이 시점 하나로 읽어드려요. (샘플 풀이 — 실제로는 회고+연도별 로드맵이 들어갑니다)`,
    months: plan.cells.map((c) => ({ ...c, note: noteFor(c) })),
    actions: [
      `${plan.topMonths[0]?.month ?? 1}월(움직이는 달) — 수입 조건 재협상 준비`,
      "이번 달 고정 지출 목록 정리 — 새는 곳 확인",
      `${vessel.name} 강점이 사는 일에 시간 배분`,
    ],
    caution: `새는 구멍이 없진 않아요. 그릇 구조상 ${strong ? "확신이 설 때 크게 거는" : "거절을 못 해서 나가는"} 방향이라 그래요. ${vessel.caution} — 이번 분기 안에 한 번만 점검해도 충분해요.`,
  };
}

/* ── 검증 ── */
export function validateReading(r: Reading): string | null {
  if (r.months.length !== 12) return "months가 12개가 아님";
  if (r.months.some((m) => !m.note || m.note.length < 4)) return "빈 월 노트";
  if (r.actions.length !== 3) return "actions가 3개가 아님";
  const banned = scanBanned(readingText(r));
  if (banned) return `금지어: ${banned}`;
  return null;
}
