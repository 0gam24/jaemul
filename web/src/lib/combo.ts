import type { VesselCode, VesselType } from "./vessel-types";

/**
 * 성격 조합 카드 + 그릇 대결 카피 모듈 (패널 결론 2026-07-17)
 *
 * - 상표 조건: UI·카드 어디에도 "MBTI" 문자열을 쓰지 않는다. "성격유형 4글자"로만 지칭.
 *   유저가 입력한 4글자(예: INFP)를 표시하는 것은 문제없음.
 * - 카피는 256개 수작업이 아니라 모듈 합성: 축별 8개 + 그릇별 16개 = 24개.
 * - 절대규칙 1: 불행 단정 금지 — 상극 판정도 리프레이밍 톤.
 */

export function normalizeMbti(raw: string): string | null {
  const s = raw.trim().toUpperCase();
  return /^[EI][NS][TF][JP]$/.test(s) ? s : null;
}

/** 축별 돈 성향 한 줄 (8개 모듈) */
const AXIS: Record<string, string> = {
  E: "사람들 속에서 돈 기회를 줍는",
  I: "혼자 판을 짤 때 힘이 나는",
  N: "아직 오지 않은 가치에 먼저 베팅하는",
  S: "손에 잡히는 실속부터 챙기는",
  T: "숫자가 맞아야 지갑을 여는",
  F: "마음이 움직이면 계산을 건너뛰는",
  J: "들어온 돈에 자리부터 정해주는",
  P: "흐름을 타면 과감해지는",
};

/** 그릇별 접합 문장 (16개 모듈) — 성향이 이 그릇을 만나면 어떻게 되는가 */
const VESSEL_JOIN: Record<VesselCode, string> = {
  SROP: "가마솥이 이 성향을 만나면 불길이 더 커져요 — 한 국자 덜어두는 습관만 있으면 판이 계속 커집니다",
  SROJ: "무쇠솥이 이 성향을 만나면 달궈지는 속도가 빨라져요 — 늦되는 그릇의 유일한 약점이 지워집니다",
  SRXP: "놋그릇이 이 성향을 만나면 광내는 손이 생긴 셈이에요 — 쓰임새만 정해주면 값이 뜁니다",
  SRXJ: "금고가 이 성향을 만나면 자물쇠에 다이얼이 하나 더 달려요 — 가끔 여는 날만 정하면 은행이 됩니다",
  SrOP: "두레박이 이 성향을 만나면 퍼 올리는 손이 두 개가 돼요 — 부을 항아리 하나만 정하면 끝",
  SrOJ: "뚝배기가 이 성향을 만나면 불 조절이 완벽해져요 — 식지 않는 구조가 완성됩니다",
  SrXP: "표주박이 이 성향을 만나면 물이 더 빨리 돌아요 — 담는 통 하나만 두면 무적입니다",
  SrXJ: "옹달샘이 이 성향을 만나면 샘 주변이 넓어져요 — 고이는 양이 달라집니다",
  WROP: "소쿠리가 이 성향을 만나면 그물코가 촘촘해져요 — 지나가던 큰돈이 걸리기 시작합니다",
  WROJ: "항아리가 이 성향을 만나면 뚜껑 여는 타이밍을 알게 돼요 — 곳간으로 가는 지름길입니다",
  WRXP: "유리병이 이 성향을 만나면 투명함이 무기가 돼요 — 같이 벌자는 사람이 늘어납니다",
  WRXJ: "장독이 이 성향을 만나면 숙성 온도가 맞춰져요 — 기다림이 장맛이 됩니다",
  WrOP: "화로가 이 성향을 만나면 불씨 값을 제대로 받게 돼요 — 재주가 돈으로 바뀝니다",
  WrOJ: "종지가 이 성향을 만나면 종지가 하나씩 늘어나요 — 어느새 상이 달라집니다",
  WrXP: "대접이 이 성향을 만나면 베푼 것이 돌아오는 길이 넓어져요 — 인심이 자산이 됩니다",
  WrXJ: "달항아리가 이 성향을 만나면 안목에 가격표가 붙어요 — 국보 감정 시작입니다",
};

/** 조합 팩폭 (예: "혼자 판을 짤 때 힘이 나는데, 흐름을 타면 과감해지는 타입…") */
export function comboFact(vessel: VesselType, mbti: string): { title: string; body: string } {
  const [ei, ns, tf, jp] = mbti.split("");
  return {
    title: `${vessel.name} × ${mbti}`,
    body: `${AXIS[ei]}데, ${AXIS[jp]} 타입이에요. ${AXIS[tf]} 편이라 ${AXIS[ns]} 순간이 승부처가 되죠. ${VESSEL_JOIN[vessel.code]}.`,
  };
}

/** 그릇 대결 판정 — 불행 단정 금지, 정반대도 리프레이밍 */
export function vsVerdict(a: VesselType, b: VesselType): { title: string; detail: string } {
  const good = a.matchGood === b.code || b.matchGood === a.code;
  const clash = a.matchBad === b.code || b.matchBad === a.code;
  if (good && !clash) {
    return {
      title: "돈이 통하는 조합",
      detail: "한쪽이 벌 판을 열고, 한쪽이 새는 곳을 막는 짝이에요. 돈 얘기를 자주 할수록 둘 다 커집니다.",
    };
  }
  if (clash) {
    return {
      title: "스타일 정반대 조합",
      detail: "돈 쓰는 문법이 정반대라 부딪히기 쉽지만, 그만큼 서로의 사각지대를 정확히 채워주는 짝이에요. 큰 결정 전에 서로에게 물어보면 실수가 반으로 줄어요.",
    };
  }
  return {
    title: "속도는 달라도 방향이 겹치는 조합",
    detail: "돈 모으는 리듬이 다를 뿐, 목적지가 비슷한 짝이에요. 계획을 나눠 맡으면 혼자보다 빨라집니다.",
  };
}
