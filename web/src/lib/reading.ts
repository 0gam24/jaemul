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
  /** 공유용 팩폭 한 줄 — 이 사주에서만 성립하는 캡처 카드 문장 (구버전 캐시에는 없음) */
  shareLine?: string;
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
  return [r.summary, r.structure, r.flow, r.actions.join(" "), r.caution, r.shareLine ?? "", ...r.months.map((m) => m.note)].join("\n");
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
  let daeunLine: string;
  if (curIdx < 0 && list.length > 0 && age < list[0].startAge) {
    // 첫 대운이 열리기 전의 어린아이 — '현재 대운'이 존재하지 않는다
    daeunLine = `아직 첫 대운 전 — 첫 대운 ${list[0].ganzhi}는 ${list[0].startYear}년(만 ${list[0].startAge}세)부터 시작`;
  } else {
    const cur = curIdx >= 0 ? list[curIdx] : list[0];
    const nxt = list[curIdx >= 0 ? curIdx + 1 : 1] ?? null;
    daeunLine = nxt
      ? `현재 대운 ${cur.ganzhi}(${cur.startAge}~${cur.endAge}세) → 다음 대운 ${nxt.ganzhi}는 ${nxt.startYear}년(만 ${nxt.startAge}세)부터`
      : `현재 대운 ${cur.ganzhi}(${cur.startAge}~${cur.endAge}세)`;
  }

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
- 입력에는 원국(간지·십성·오행·용신), 공망, 신살, [관계·신살 확정표], 대운 목록과 교체 연월 고정 문구, 세운, 그리고 [월 캘린더 계산표](향후 12개월의 연/월/간지/십성/level)가 포함된다.
- 너는 어떤 간지·십성·신살·level도 스스로 계산하거나 추정하지 않는다. 입력에 없는 요소를 언급하면 생성 실패다. 입력된 길신 목록에 없는 달에 귀인을 배치하는 것 금지. 십성 명칭은 입력 표기와 글자 단위로 일치 — 비견과 겁재가 섞이면 '비겁'으로 통칭하거나 분리한다.
- 합·충·신살·공망의 위치(연지/월지/일지/시지)는 [관계·신살 확정표]에 적힌 궁위만 사용한다. 표와 다른 위치를 말하면 생성 실패다. 위치가 표에 없으면 위치 언급 없이 관계만 서술한다.
- 확정표의 천간 충·극은 본문에서 "서로 부딪치는 구조", "누르는 기운" 같은 쉬운 말로만 풀고, 간지 쌍의 원어 병기(예: "己乙충")는 하지 않는다 — 학파에 따라 명칭이 갈리는 지점이라 원어를 박으면 오히려 신뢰를 잃는다.
- months 노트는 계산표의 순서 그대로 12개를 작성한다. level은 표의 값을 그대로 따르며 바꾸지 않는다.

[일관성 — 위반 시 생성 실패]
- 같은 근거로 섹션마다 반대 결론을 내지 않는다. 역할 고정: 오행 결핍 = 순환·유통의 부재(들어온 돈이 안 굴러감 — '샌다'가 아니다) / 공망 = 헛돌아 새는 자리. 이 역할을 섹션 간에 바꾸면 실패다.
- structure에서 크게 세운 결핍·공망 서사는 flow에서 반드시 회수한다 — 새 대운의 간지가 그 결핍 오행을 처음 채우거나, 충·합으로 공망이 풀리는 경우 그것이 flow의 하이라이트다. 회수 없이 다른 얘기로 넘어가면 실패다.

[화자] 사주 잘 아는 친구. 가벼운 존댓말("~예요/~해요/~죠"). 도사·선생 톤 금지. 권위의 출처는 항상 계산. 유머 허용, 호들갑 금지.

[나이 프레임 — 입력의 [독자 프레임]을 전 섹션에 적용. 위반 시 생성 실패]
- 만 18세 이하: 읽는 사람은 부모다. 호칭은 "아이/이 아이"로 쓰고 부모에게 말을 건다. 연봉·계약·단가·결제·지출 관리 조언 금지 — 이 아이의 돈 그릇 씨앗, 돈 습관이 형성되는 시기, 재주가 훗날 돈으로 바뀌는 적성 신호, 용돈·저축 교육을 시작하기 좋은 달 중심으로 쓴다. 캘린더 노트와 행동 3가지도 전부 "부모가 이 달에 해줄 것"으로. shareLine도 부모가 공감할 아이 팩폭으로.
- 만 19~24세(학생·사회초년): 첫 수입·알바·인턴·취업 조건, 소비 습관 형성 중심. "연봉 재협상" 대신 "첫 조건 제대로 묻기". 모아둔 돈이 적다는 전제로 쓴다.
- 만 25~54세: 기본 프레임 — 수입 조건·계약·지출 관리.
- 만 55세 이상: 지키고 흐르게 하는 돈 — 수입 전환기, 현금 흐름, 가족·자녀와 돈 경계. 공격적 확장 조언 금지.

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
- 첫 문장은 계산표에서 오늘로부터 가장 가까운 level 3 달로 시작한다 — 결제한 사람이 제일 먼저 듣고 싶은 건 "당장 언제"다. 먼 달을 첫 문장에 두면 실패다.
- 첫 두 문장 안에 level 3 달 2개를 월 숫자로 직답한다(예: "가장 가까운 돈길은 9월 — 그다음 큰 문은 내년 1월에 열려요"). 대운 서사는 그 다음.

[재물 구조 structure — 700~900자]
- 도입부에서 입력된 무료 카드 팩폭 문장을 정확히 1회 인용하고, 그 문장이 성립하는 이유를 원국 근거(합·충·오행 결핍·공망 등) 최소 2개로 설명한다.
- 유형 이름 자체를 근거로 쓰지 않는다("~형이라는 이름이 괜히 붙은 게 아니다" 류 금지). 근거는 오직 간지·십성·합충·공망·신살.

[대운 흐름 flow — 500~700자]
- 첫 줄에 입력된 '대운 교체 고정 문구'를 그대로 인용한다. 전 섹션이 이 시점 하나만 쓰고, "직전/출발점/올해 마무리" 등 상이한 표현 혼용 금지.
- 첫 문단은 지난 대운 10년 회고: 연도 명시 + 현재 대운 십성과 원국 체질의 관계로 그 시기의 체감을 서술. 패턴: "20XX~20XX년, [체감] — 그게 [간지·십성] 위를 [원국 체질]로 걸어온 흔적이에요."
- 고정 문구가 "아직 첫 대운 전"이면 지난 대운 회고 대신 태어나서 지금까지의 세운 흐름으로 회고하고, 첫 대운이 열리는 해가 이 아이에게 어떤 전환인지를 하이라이트로 쓴다.
- 말미에 세운 로드맵(입력 표의 간지·십성 인용)과 다음 대운 1~2문장 전망.

[월 캘린더 months]
- 각 노트(25자 내외)는 해당 월의 간지·십성에서 도출하고 근거 1개+행동 1개를 담는다. 어느 사주에나 성립하는 문장("검증이 먼저", "안정 수입 굳히기" 류) 금지.
- 노트에는 한자·전문용어 금지 — 별명 사전과 행동 언어만 사용(나쁜 예: "용신 경금 만개" / 좋은 예: "재주가 돈 되는 달, 협상 꺼내기").
- level 3 노트는 헤지 금지: "적기/유리" 대신 무슨 성격의 돈이 어떤 행동으로 오는지 장면화.
- 공망 지지가 월지인 달은 노트에서 공망 해석을 회수한다.

[행동 actions — 3개, 각 40~70자]
- 조사와 서술어를 갖춘 완결된 존댓말 문장으로 쓴다. 전보체·명사 나열·대시 태그(예: "— 상관/정관") 금지 — 근거는 별명으로 문장 안에 녹인다.
- 각 행동은 캘린더의 특정 월과 연결하되 연도까지 명시하고(예: "2026년 9월"), 그 달의 캘린더 노트와 같은 주제를 다룬다 — 행동과 노트가 같은 달에 서로 다른 숙제를 내면 실패다. "무엇을·누구에게·어떻게"가 보이게 장면화한다(나쁜 예: "9월 단가 제시 문서화" / 좋은 예: "2026년 9월엔 미루던 돈 얘기를 먼저 꺼내세요 — 직장인이면 연봉·인센티브 조건을, 내 일 하는 분이면 단가를 문서로 남기면서요").
- 독자의 직업을 단정하지 않는다. 고용 형태에 따라 갈리는 행동은 "직장인이라면 ○○, 내 일 하는 분이라면 ○○" 분기로 쓴다.
- 3개는 서로 다른 원국 근거. 최소 1개는 이 사주에만 성립하는 고유 행동.

[지출 구멍 caution — 300~400자]
- 4단: ①소비 장면 묘사 ②확인 화법 ③원국 고유 지표(공망·신살 중 입력에 있는 것 1개 이상) 인용 ④금지 대신 '조절 장치'형 처방 — 장치 이름은 반드시 유형 은유 계열의 사물로 쓴다(항아리면 뚜껑·마개, 표주박이면 마개·물길 — '밸브'·'파이프' 같은 기계 용어 금지).
- ③의 지표는 structure에서 이미 주 근거로 자세히 쓴 것을 재탕하지 않는다 — 입력에 있는 다른 지표를 우선하고, 다른 지표가 없을 때만 재사용한다.
- ①은 무료 카드 팩폭과 같은 방향 기본. 반대 방향 패턴은 "~하는 편이라면" 조건부로만. 확인 화법("있으시죠")은 풀이 전체 1회.
- 말미에 다음 해 세운 1문장 예고(결과 보장 금지).

[공유 한 줄 shareLine — 18~35자]
- 이 사주 원국 근거에서만 나오는 팩폭 한 줄. 읽은 사람이 "어 이거 완전 나야" 하고 캡처해서 친구에게 보내고 싶어지는 문장이 목표다.
- 입력의 무료 카드 팩폭 문장과 겹치지 않는 새 문장. 저격 톤 허용 — "~하죠?", "~잖아요"로 찌르되 다정한 위로 톤 금지.
- 전문용어·한자·간지 금지. 쉬운 말만. 이 문장 하나만 떼어 봐도 성립해야 한다(본문 맥락 참조 금지).
- 좋은 예시의 결: "모으는 건 금고급인데 여는 손잡이가 없죠?" / 나쁜 예: "당신은 신중한 편이에요"(누구에게나 성립), "정재가 강한 사주예요"(용어).

[전 섹션 공통]
- 은유는 유형 이름에서 파생된 한 계열만 쓴다(항아리형이면 항아리·뚜껑·마개·물길·가득참). 파이프·밸브·엔진·문·열쇠 등 다른 계열의 사물을 섞으면 실패다 — 같은 뜻을 그 유형의 사물로 바꿔 말한다.
- 말투는 2030 구어 한 결로 통일한다("텅장" 같은 가벼운 밈 어휘 허용). 문학적·시적 문장은 각 섹션 마지막 한 줄에만 허용 — 본문 중간에 시적 문장과 밈 어휘가 한 문단에 섞이면 실패다.
- 관계 용어(화국·합·충 등)도 십성과 같은 규칙 — 쉬운 말이 주인공, 원어 병기는 첫 1회만 허용하고 생략해도 된다(예: "불기운끼리 뭉쳐 큰 불덩어리가 되죠" — '화국'은 빼도 무방).
- 희귀 지표(공망·특살·12살) 중 입력에 존재하는 것 최소 2개를 서로 다른 섹션에서 사용.
- 사용자의 만 나이는 전체에서 정확히 1회만 직접 언급한다("만 35세의 당신" 반복 금지 — 두 번째부터는 템플릿 티가 난다). 연도 숫자는 본문에 최소 2회 사용.
- 각 섹션 마지막 문장은 유형 세계관(그릇)을 변주한 저장 가능한 한 줄. 섹션당 은유 1개.
- "—"는 섹션당 최대 1회. "본론이에요/정리하면" 등 메타 문장 금지. "~에요" 4문장 연속 금지.`;

/* ── structured output 스키마 — 노트만 LLM이 작성 ── */
export const READING_SCHEMA = {
  type: "object" as const,
  additionalProperties: false,
  required: ["summary", "structure", "flow", "monthNotes", "actions", "caution", "shareLine"],
  properties: {
    summary: { type: "string", description: "2~3문장. 첫 문장은 가장 가까운 level 3 달, 두 문장 안에 level 3 달 2개 직답" },
    structure: { type: "string", description: "재물 구조 700~900자" },
    flow: { type: "string", description: "대운 흐름 500~700자. structure의 결핍·공망 서사를 반드시 회수" },
    monthNotes: {
      type: "array",
      description: "월 캘린더 계산표의 순서 그대로 12개 노트 (25자 내외)",
      items: { type: "string" },
    },
    actions: { type: "array", items: { type: "string" }, description: "행동 3개, 각 40~70자 완결 문장, 월 번호 명시, 용어 태그 금지" },
    caution: { type: "string", description: "지출 구멍 300~400자, 4단 구조" },
    shareLine: { type: "string", description: "공유용 팩폭 한 줄 18~35자 — 이 사주에서만 성립, 용어·한자 금지" },
  },
};

export type LlmDraft = {
  summary: string;
  structure: string;
  flow: string;
  monthNotes: string[];
  actions: string[];
  caution: string;
  shareLine: string;
};

/* ── 관계·신살 확정표 — 궁위(위치)를 엔진 값으로 못 박아 LLM의 위치 추정을 차단한다 ── */

const PILLAR_KO: Record<string, string> = { year: "연", month: "월", day: "일", hour: "시" };

type SajuFacts = {
  pillars: Record<string, string>;
  gongmang: { branches: string[] };
  sals: Record<string, { twelveSal: string; specialSals: string[] }>;
  stemRelations: { type: string; pillars: string[]; desc: string }[];
  branchRelations: Record<string, Record<string, string>>;
};

/** 지지 글자 → 그 글자가 놓인 궁위 목록 (예: 未 → 월지·연지) */
function branchPositions(pillars: Record<string, string>, ch: string): string {
  const pos = ["hour", "day", "month", "year"].filter((p) => pillars[p]?.[1] === ch).map((p) => `${PILLAR_KO[p]}지`);
  return pos.length ? pos.join("·") : "";
}

export function buildFixedFacts(saju: SajuResult): string {
  const s = saju as unknown as SajuFacts;
  const lines: string[] = [];

  // 신살 — 기둥별 확정
  const salLine = ["year", "month", "day", "hour"]
    .map((p) => {
      const v = s.sals?.[p];
      if (!v) return null;
      const items = [v.twelveSal, ...(v.specialSals ?? [])].filter(Boolean);
      return items.length ? `${PILLAR_KO[p]}지 ${items.join("·")}` : null;
    })
    .filter(Boolean)
    .join(" / ");
  if (salLine) lines.push(`신살(궁위 확정): ${salLine}`);

  // 공망 — 원국에서 실제로 해당되는 기둥까지 명시
  const gm = s.gongmang?.branches ?? [];
  if (gm.length) {
    const hits = gm.map((b) => ({ b, at: branchPositions(s.pillars, b) })).filter((x) => x.at);
    lines.push(
      `공망: ${gm.join("·")}${hits.length ? ` — 원국에서는 ${hits.map((x) => `${x.at}의 ${x.b}`).join(", ")}만 해당` : " — 원국 지지에는 없음"}`
    );
  }

  // 천간 합·충 — 궁위 포함
  for (const r of s.stemRelations ?? []) {
    lines.push(`천간 ${r.type}: ${r.desc} (${r.pillars.map((p) => `${PILLAR_KO[p]}간`).join("-")})`);
  }

  // 지지 관계 — 관계별로 참여 글자와 각 글자의 궁위를 명시
  for (const [kind, byPillar] of Object.entries(s.branchRelations ?? {})) {
    if (kind === "지장간" || !byPillar || Object.keys(byPillar).length === 0) continue;
    const descs = new Set<string>();
    for (const d of Object.values(byPillar)) d.split(",").forEach((x) => descs.add(x.trim()));
    for (const d of descs) {
      const chars = Array.from(d).filter((ch) => /[一-鿿]/.test(ch));
      const where = chars
        .map((ch) => {
          const at = branchPositions(s.pillars, ch);
          return at ? `${ch}=${at}` : null;
        })
        .filter(Boolean)
        .join(", ");
      lines.push(`지지 ${kind}: ${d}${where ? ` (${where})` : ""}`);
    }
  }

  return lines.join("\n");
}

/** LLM 유저 페이로드 — 동적 데이터는 전부 여기 (시스템 프롬프트는 불변) */
export function buildUserPayload(saju: SajuResult, vessel: VesselType, plan: MonthPlan): string {
  const table = plan.cells
    .map((c, i) => `${i + 1}. ${c.year}년 ${c.month}월 | ${c.ganzhi} | ${c.tengod} | level ${c.level}`)
    .join("\n");
  const tops = plan.topMonths.map((t) => `${t.month}월(${t.tengod})`).join(", ");
  const age = (saju as unknown as { currentAge: number }).currentAge;
  const band =
    age <= 18 ? "미성년 — 부모가 읽는다" : age <= 24 ? "학생·사회초년" : age <= 54 ? "기본(수입·계약·지출)" : "55세 이상(지키는 돈)";
  return [
    `[재물그릇 유형] ${vessel.name} — ${vessel.tagline}`,
    `[독자 프레임] 만 ${age}세 → ${band} — [나이 프레임] 규칙을 전 섹션에 적용`,
    `[무료 카드 팩폭 문장 — structure에서 1회 인용] ${vessel.fact}`,
    `[대운 교체 고정 문구 — flow 첫 줄에 그대로 인용] ${plan.daeunLine}`,
    `[관계·신살 확정표 — 합·충·신살·공망의 위치는 반드시 이 표의 궁위만 사용]`,
    buildFixedFacts(saju),
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
    shareLine: draft.shareLine,
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
    shareLine: `${vessel.name}은 모으는 힘은 넘치는데, 여는 손잡이가 없죠?`,
  };
}

/* ── 검증 ── */
export function validateReading(r: Reading): string | null {
  if (r.months.length !== 12) return "months가 12개가 아님";
  if (r.months.some((m) => !m.note || m.note.length < 4)) return "빈 월 노트";
  if (r.actions.length !== 3) return "actions가 3개가 아님";
  if (!r.shareLine || r.shareLine.length < 10) return "shareLine 부족 (10자 미만)";
  if (/[一-鿕]/.test(r.shareLine)) return "shareLine에 한자 포함";
  const banned = scanBanned(readingText(r));
  if (banned) return `금지어: ${banned}`;
  return null;
}
