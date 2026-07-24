import type { SajuResult } from "ssaju";

/**
 * 재물그릇 16유형 — 콘텐츠 코어 (SPEC §2)
 *
 * 매핑 축 (전부 ssaju 산출값에서 결정적으로 유도 — 같은 사주 = 같은 유형):
 *   ① 신강/신약  S/W — advanced.dayStrength (neutral은 S 취급)
 *   ② 재성 강약  R/r — 십성 중 정재+편재 개수 (2개 이상 = R)
 *   ③ 식상 유무  O/X — 식신·상관 존재 여부 (돈을 만들어내는 활동력)
 *   ④ 재성 성향  P/J — 편재 우세 = P(유동·큰돈), 정재 우세·동수·무재 = J(축적·안정)
 *
 * 카피 원칙 (CLAUDE.md 절대규칙 1): 불행 단정 금지. caution은 반드시
 * 리프레이밍 톤("~하면 ~된다"의 행동 제안형)으로만 쓴다.
 *
 * ── 카피 가이드 (전 유형 공통 — 유형 추가·수정 시 반드시 지킬 것) ──
 * 1. 한 유형의 카피는 그 유형의 imagery 사물 안에서만 은유한다.
 *    다른 유형의 그릇 이름(항아리·장독·두레박…)을 빌려 쓰는 순간 세계관이 깨진다.
 * 2. 주어-결과 연결: "A를 하면 A가 좋아진다"로 닫는다. "항아리를 열면 곳간이 된다"처럼
 *    주어가 도중에 다른 사물로 바뀌는 문장 금지. (금고→은행 같은 명시적 '승급' 은유만 예외)
 * 3. 공통 문장 틀에 키워드만 갈아끼우지 않는다 — 유형마다 문장 구조가 달라도 된다.
 * 4. 톤은 가벼운 구어 한 결. 시적 문장은 한 카피에 한 번만.
 * 5. 기계·설비 용어(밸브·파이프·엔진) 금지 — 전통 그릇 세계관과 충돌한다.
 * 6. imagery는 유료 풀이 LLM에도 "이 사물로만 은유하라"로 주입된다 —
 *    여기 목록이 곧 그 유형의 은유 어휘 전부라고 생각하고 채울 것.
 */

export type VesselCode =
  | "SROP" | "SROJ" | "SRXP" | "SRXJ"
  | "SrOP" | "SrOJ" | "SrXP" | "SrXJ"
  | "WROP" | "WROJ" | "WRXP" | "WRXJ"
  | "WrOP" | "WrOJ" | "WrXP" | "WrXJ";

export type VesselType = {
  code: VesselCode;
  slug: string;           // URL·파일명용
  name: string;           // 칭호 (카드 전면)
  tagline: string;        // 한 줄 정체성 (카드 서브)
  fact: string;           // 유형 팩폭 한 줄 (소름 포인트)
  strengths: [string, string];
  caution: string;        // 주의 1 — 리프레이밍 필수
  per100: number;         // 100명 중 N명 — scripts/rarity-calc.ts 전수계산(81,984샘플) 근거
  matchGood: VesselCode;  // 잘 맞는 그릇
  matchBad: VesselCode;   // 상극 그릇 (궁합 티저용)
  element: "목" | "화" | "토" | "금" | "수"; // 카드 색 테마
  /** 이 유형의 은유 사물 사전 — 카피·유료 풀이가 은유에 쓸 수 있는 어휘 전부 */
  imagery: string;
};

export const VESSEL_TYPES: Record<VesselCode, VesselType> = {
  SROP: {
    code: "SROP", slug: "gamasot", name: "가마솥형",
    tagline: "크게 걸고 크게 끓인다",
    fact: "남들이 아끼는 동안 판을 키워서 버는 스타일, 맞죠?",
    strengths: ["돈이 되는 판을 알아보는 눈", "벌어들이는 스케일 자체가 큼"],
    caution: "불이 좋을 때 한 국자 덜어 두면, 다음 판의 밑천이 됩니다",
    per100: 1, matchGood: "WrOJ", matchBad: "SRXJ", element: "화",
    imagery: "가마솥·아궁이·장작불·국자·한소끔 끓임",
  },
  SROJ: {
    code: "SROJ", slug: "musoesot", name: "무쇠솥형",
    tagline: "늦게 차지만 절대 안 샌다",
    fact: "한 번 번 돈은 웬만해선 안 나가는 타입이네요",
    strengths: ["꾸준함이 복리로 쌓이는 구조", "위기에 강한 맷집"],
    caution: "달궈지기까지가 느릴 뿐 — 데워지기 시작한 해에 속도가 붙습니다",
    per100: 3, matchGood: "WrXP", matchBad: "SrXP", element: "금",
    imagery: "무쇠솥·달굼·잔열·솥뚜껑·묵직함",
  },
  SRXP: {
    code: "SRXP", slug: "notgeureut", name: "놋그릇형",
    tagline: "닦을수록 빛나는 큰 그릇",
    fact: "기회는 계속 오는데 정리를 미루는 편이죠?",
    strengths: ["들어오는 돈의 단위가 큼", "귀인이 돈길을 열어주는 상"],
    caution: "쓰임새를 정해두고 닦아주면, 광은 저절로 납니다",
    per100: 6, matchGood: "WrOP", matchBad: "WrXJ", element: "금",
    imagery: "놋그릇·놋쇠·광·닦기·귀한 손님상",
  },
  SRXJ: {
    code: "SRXJ", slug: "geumgo", name: "금고형",
    tagline: "모으면 잠근다, 새는 법이 없다",
    fact: "통장 잔고 확인이 취미인 거, 들켰습니다",
    strengths: ["지키는 힘 하나는 16유형 중 최강", "충동 지출 면역"],
    caution: "가끔 문을 열어 굴려주면, 금고가 아니라 은행이 됩니다",
    per100: 10, matchGood: "SrOP", matchBad: "SROP", element: "토",
    imagery: "금고·문·잠금장치·귀중품·은행(승급 은유)",
  },
  SrOP: {
    code: "SrOP", slug: "durebak", name: "두레박형",
    tagline: "퍼 올리는 힘은 최고",
    fact: "버는 재주는 확실한데 담아둘 곳을 안 정했죠?",
    strengths: ["어디서든 돈을 길어 올리는 실행력", "부업·사이드잡 재능"],
    caution: "길어 온 물을 모아 둘 큰 물통 하나만 정하면, 흐름이 재산이 됩니다",
    per100: 4, matchGood: "SRXJ", matchBad: "WROP", element: "수",
    imagery: "두레박·우물·줄·긷기·큰 물통",
  },
  SrOJ: {
    code: "SrOJ", slug: "ttukbaegi", name: "뚝배기형",
    tagline: "천천히 데워져 오래 안 식는다",
    fact: "화려하진 않아도 잔고가 뒤로 갈수록 두꺼워지는 타입",
    strengths: ["은근하게 오래 가는 수입 구조", "유행 안 타는 안정감"],
    caution: "남의 속도와 비교하지 않는 해에, 뚝배기는 가장 뜨겁습니다",
    per100: 11, matchGood: "WRXP", matchBad: "SRXP", element: "토",
    imagery: "뚝배기·뭉근한 불·잔열·온기·구수함",
  },
  SrXP: {
    code: "SrXP", slug: "pyojubak", name: "표주박형",
    tagline: "들어올 때 화끈, 나갈 때 더 화끈",
    fact: "월급날과 텅장날 사이가 유독 짧은 편이죠?",
    strengths: ["돈이 도는 길목을 타는 감각", "쓸 때 제대로 쓰는 화통함"],
    caution: "표주박은 원래 퍼 마시는 그릇 — 담는 통을 따로 두면 완성됩니다",
    per100: 6, matchGood: "SROJ", matchBad: "WRXJ", element: "수",
    imagery: "표주박·마개·박 넝쿨·물 따르기·담는 통",
  },
  SrXJ: {
    code: "SrXJ", slug: "ongdalsaem", name: "옹달샘형",
    tagline: "마르지 않는 잔잔한 샘",
    fact: "크게 벌 욕심보다 안 마르는 게 중요한 타입이네요",
    strengths: ["끊기지 않는 현금 흐름", "무리하지 않는 재무 감각"],
    caution: "샘 주변을 조금만 넓혀도, 고이는 양이 달라집니다",
    per100: 13, matchGood: "WROP", matchBad: "SROP", element: "수",
    imagery: "옹달샘·샘물·바닥·고임·물길",
  },
  WROP: {
    code: "WROP", slug: "sokuri", name: "소쿠리형",
    tagline: "큰돈이 지나가는 길목의 그릇",
    fact: "만지는 돈은 큰데 내 몫 챙기는 건 뒷전이죠?",
    strengths: ["큰돈을 다루는 자리와 인연", "돈의 흐름을 읽는 시야"],
    caution: "소쿠리에 비닐 한 장 — 자동이체 하나만 깔면 새던 게 담깁니다",
    per100: 3, matchGood: "SrXJ", matchBad: "SrOP", element: "목",
    imagery: "소쿠리·틈·비닐 한 장·채반·받침",
  },
  WROJ: {
    code: "WROJ", slug: "hangari", name: "항아리형",
    tagline: "모으는 건 천재, 여는 게 문제",
    fact: "적금 깨는 날보다 붓는 날이 훨씬 마음 편하죠?",
    strengths: ["저축 체질 — 모이는 속도가 남다름", "목돈 만드는 인내심"],
    caution: "1년에 한 번 뚜껑 열어 굴리는 날을 정하면 — 항아리가 해마다 한 뼘씩 커집니다",
    per100: 6, matchGood: "SROP", matchBad: "SrXP", element: "토",
    imagery: "항아리·뚜껑·마개·가득 참·굽",
  },
  WRXP: {
    code: "WRXP", slug: "yuribyeong", name: "유리병형",
    tagline: "안이 다 보이는 투명한 그릇",
    fact: "돈 문제만큼은 숨기는 걸 못 하는 타입이네요",
    strengths: ["투명한 돈 관리 — 신용이 자산", "같이 벌 사람이 모이는 상"],
    caution: "유리병은 부딪힐 자리만 피하면 오래갑니다 — 변동 큰 판만 걸러도 충분해요",
    per100: 5, matchGood: "SrOJ", matchBad: "SROJ", element: "금",
    imagery: "유리병·투명함·코르크 마개·빛·부딪힘",
  },
  WRXJ: {
    code: "WRXJ", slug: "jangdok", name: "장독형",
    tagline: "묵혀야 제맛이 드는 그릇",
    fact: "빨리 버는 것보다 오래 두는 게 체질에 맞죠?",
    strengths: ["오래 묵힐수록 강해지는 체질", "시간이 편이 되는 구조"],
    caution: "뚜껑을 자주 열면 장맛이 안 듭니다 — 조급한 해만 넘기면 됩니다",
    per100: 9, matchGood: "SrOP", matchBad: "SrXP", element: "목",
    imagery: "장독·뚜껑·숙성·장맛·볕과 바람",
  },
  WrOP: {
    code: "WrOP", slug: "hwaro", name: "화로형",
    tagline: "돈을 데우는 재주가 있는 그릇",
    fact: "내 돈보다 남의 돈 불려주는 재주가 먼저 보이는 타입",
    strengths: ["돈 되는 아이디어 제조기", "사람을 통해 재물이 붙는 상"],
    caution: "불씨 값부터 챙기세요 — 재주값을 청구하기 시작한 해부터 화로가 커집니다",
    per100: 4, matchGood: "SRXP", matchBad: "WROJ", element: "화",
    imagery: "화로·숯·불씨·온기·부채질",
  },
  WrOJ: {
    code: "WrOJ", slug: "jongji", name: "종지형",
    tagline: "작지만 매일 채워지는 그릇",
    fact: "티끌 모아 태산을 진짜로 실행 중인 타입이네요",
    strengths: ["매일 채우는 성실 루틴", "작아도 마르지 않는 구조"],
    caution: "종지를 둘, 셋으로 늘려 보세요 — 어느새 한 상이 차려집니다",
    per100: 10, matchGood: "SROP", matchBad: "SRXP", element: "목",
    imagery: "종지·간장·한 술·상차림·옹기종기",
  },
  WrXP: {
    code: "WrXP", slug: "daejeop", name: "대접형",
    tagline: "남부터 담아주는 넉넉한 그릇",
    fact: "모임에서 카드 먼저 꺼내는 사람, 본인이죠?",
    strengths: ["베푼 만큼 돌아오는 인복 재물", "돈보다 큰 신뢰 자산"],
    caution: "내 몫의 대접을 맨 먼저 채우고 나누면, 인심도 재산도 남습니다",
    per100: 4, matchGood: "SROJ", matchBad: "SrOP", element: "화",
    imagery: "대접·국물·한 그릇·나눔·손님상",
  },
  WrXJ: {
    code: "WrXJ", slug: "dalhangari", name: "달항아리형",
    tagline: "비어 보여도 값은 최고",
    fact: "잔고보다 안목·감각이 먼저 쌓이는 타입이네요",
    strengths: ["돈으로 못 사는 감각 자산", "때가 오면 값이 뛰는 희소성"],
    caution: "감각에 가격표를 붙이는 순간부터 — 달항아리는 국보가 됩니다",
    per100: 6, matchGood: "SRXP", matchBad: "WROP", element: "금",
    imagery: "달항아리·여백·백자·안목·국보(승급 은유)",
  },
};

export function vesselBySlug(slug: string): VesselType | null {
  return Object.values(VESSEL_TYPES).find((v) => v.slug === slug) ?? null;
}

export const ELEMENT_COLORS: Record<VesselType["element"], string> = {
  목: "var(--el-mok)",
  화: "var(--el-hwa)",
  토: "var(--el-to)",
  금: "var(--el-geum)",
  수: "var(--el-su)",
};

const WEALTH_GODS = new Set(["정재", "편재"]);
const OUTPUT_GODS = new Set(["식신", "상관"]);

/** ssaju 결과 → 16유형 코드 (결정적) */
export function classifyVessel(saju: SajuResult): VesselType {
  const slots: string[] = [];
  (["year", "month", "day", "hour"] as const).forEach((p) => {
    const g = saju.tenGods[p];
    if (p !== "day") slots.push(g.stem); // 일간(본인)은 제외
    slots.push(g.branch);
  });

  const wealthCount = slots.filter((s) => WEALTH_GODS.has(s)).length;
  const outputCount = slots.filter((s) => OUTPUT_GODS.has(s)).length;
  const pyeonjae = slots.filter((s) => s === "편재").length;
  const jeongjae = slots.filter((s) => s === "정재").length;

  // 임계값은 1970~2005 출생 그리드 648샘플 실측 분포로 보정 (scripts/axis-check.ts):
  // score 중앙값 72, 재성≥2 = 44%, 식상≥2 = 40%, 편재우세 = 33% → 유형 쏠림 방지
  const s = saju.advanced.dayStrength.score >= 72 ? "S" : "W";
  const r = wealthCount >= 2 ? "R" : "r";
  const o = outputCount >= 2 ? "O" : "X";
  const pj = pyeonjae > jeongjae ? "P" : "J";

  const code = `${s}${r}${o}${pj}` as VesselCode;
  return VESSEL_TYPES[code];
}
