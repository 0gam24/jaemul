import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getSaju, type ManseInput } from "@/lib/manseryeok";
import { classifyVessel } from "@/lib/vessel-types";
import {
  getPaidStore,
  getCachedReading,
  putCachedReading,
  isPaid,
  isValidOrderId,
  markPaid,
  type CachedReading,
} from "@/lib/paid-store";
import { isOrderPaidAtToss } from "@/lib/toss-server";
import {
  READING_SYSTEM,
  READING_SCHEMA,
  buildMonthPlan,
  buildUserPayload,
  assembleReading,
  mockReading,
  validateReading,
  type LlmDraft,
} from "@/lib/reading";

/**
 * 유료 상세 풀이 생성 v2 (검증단 P0 반영)
 * - 서버 재계산(클라 계산값 불신) + 롤링 캘린더는 엔진이 산정, LLM은 노트만
 * - 프롬프트 캐싱(시스템 고정) / 가드레일 위반 시 1회 재생성 / 최종 실패 502
 * - 결제 검증(KV 영수증 → 토스 조회) + 주문번호별 풀이 캐시가 앞단에 붙어 있다
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = { input: ManseInput; orderId?: string; turnstileToken?: string };

/**
 * Turnstile 서버 검증 (M4 봇 방어) — LLM 비용이 나가는 이 엔드포인트의 문지기.
 * TURNSTILE_SECRET_KEY가 없으면 검증을 건너뛴다 (키 등록 전 무중단 배포용).
 */
async function verifyTurnstile(token: string | undefined, ip: string | null): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const params = new URLSearchParams({ secret, response: token });
    if (ip) params.set("remoteip", ip);
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const data = (await res.json()) as { success: boolean };
    return data.success === true;
  } catch {
    // 검증 서버 장애 시 결제 고객을 막지 않는다 (fail-open)
    return true;
  }
}

/**
 * 로컬에서 결제 없이 /p를 미리보기 위한 우회 스위치.
 * .env.local에 DEV_UNLOCK_READING=1 을 넣은 개발 환경에서만 켜진다 — 운영 빌드는
 * NODE_ENV=production이라 환경변수가 실수로 들어가도 절대 열리지 않는다(이중 잠금).
 */
const DEV_UNLOCK =
  process.env.NODE_ENV !== "production" && process.env.DEV_UNLOCK_READING === "1";

/**
 * 결제 게이트 — 이 엔드포인트의 진짜 문지기.
 *
 * 이전에는 잠금이 기기 localStorage에만 있어서 여기로 직접 요청하면 990원 풀이가 무료로
 * 나왔다(LLM 비용도 그대로 발생). 이제 자격은 서버만 판단한다:
 *   ① KV 영수증 확인 → ② 없으면 토스에 직접 조회(진실의 원천) → ③ 둘 다 아니면 거절.
 * ②에서 통과하면 영수증을 복구해 두므로 다음 열람은 다시 빨라지고, KV 쓰기가 실패했던
 * 결제자도 정상 열람된다(돈은 냈는데 못 보는 상황 방지).
 *
 * 기본값은 fail-closed — 저장소가 없든 조회가 실패하든 '미결제'로 본다.
 */
async function checkPaid(
  orderId: unknown,
  kv: Awaited<ReturnType<typeof getPaidStore>>
): Promise<boolean> {
  if (DEV_UNLOCK) return true;
  if (!isValidOrderId(orderId)) return false;
  if (kv && (await isPaid(kv, orderId))) return true;
  if (await isOrderPaidAtToss(orderId)) {
    if (kv) await markPaid(kv, orderId);
    return true;
  }
  return false;
}

/** 오행 카운트 (목·화·토·금·수) — '왜 이 유형인지'를 한 컷으로 보여주는 도식의 데이터 */
function getElements(saju: ReturnType<typeof getSaju>["saju"]): Record<string, number> {
  return (saju as unknown as { fiveElements: Record<string, number> }).fiveElements;
}

function isValidInput(input: unknown): input is ManseInput {
  if (typeof input !== "object" || input === null) return false;
  const i = input as Record<string, unknown>;
  return (
    typeof i.year === "number" && i.year >= 1930 && i.year <= new Date().getFullYear() &&
    typeof i.month === "number" && i.month >= 1 && i.month <= 12 &&
    typeof i.day === "number" && i.day >= 1 && i.day <= 31 &&
    (i.gender === "남" || i.gender === "여")
  );
}

async function generateDraft(payload: string, retryNote?: string): Promise<LlmDraft> {
  const client = new Anthropic();
  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "medium",
      format: { type: "json_schema", schema: READING_SCHEMA },
    },
    system: [
      { type: "text", text: READING_SYSTEM, cache_control: { type: "ephemeral" } },
    ],
    messages: [
      {
        role: "user",
        content: retryNote ? `${payload}\n\n[재생성 사유 — 반드시 수정] ${retryNote}` : payload,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("reading_refused");
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no_text_output");
  return JSON.parse(text.text) as LlmDraft;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }
  if (!isValidInput(body.input)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  // 결제 확인이 먼저 — 돈 낸 손님이 봇 검사에 걸려 막히는 일이 없도록 순서를 앞에 둔다
  const kv = await getPaidStore();
  if (!(await checkPaid(body.orderId, kv))) {
    return NextResponse.json({ error: "payment_required" }, { status: 402 });
  }

  // 같은 주문번호로 이미 구운 풀이가 있으면 그대로 돌려준다 —
  // 새로고침·재접속마다 LLM을 다시 부르지 않는다 (주문 1건 = 생성 1회)
  if (kv && isValidOrderId(body.orderId)) {
    const cached = await getCachedReading(kv, body.orderId);
    if (cached) return NextResponse.json({ ...cached, cached: true });
  }

  const ip = req.headers.get("cf-connecting-ip");
  if (!(await verifyTurnstile(body.turnstileToken, ip))) {
    return NextResponse.json({ error: "bot_check_failed" }, { status: 403 });
  }

  // 서버 재계산 + 엔진 캘린더 플랜 (결제 시점 기준 롤링 12개월)
  // 서버(Workers)는 UTC — KST로 환산한 날짜를 기준으로 삼아 '지난 달 판매 금지' 원칙을 지킨다
  const { saju } = getSaju(body.input);
  const vessel = classifyVessel(saju);
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  const plan = buildMonthPlan(body.input, new Date(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));

  // 프리플라이트 게이트: 엔진 데이터가 비면 LLM을 호출하지 않는다 (검증단 P0)
  if (plan.cells.length !== 12 || plan.cells.some((c) => !c.ganzhi)) {
    return NextResponse.json({ error: "engine_plan_failed" }, { status: 500 });
  }

  // 다 구운 풀이만 캐시에 넣는다 — 실패한 생성은 저장하지 않아 재시도가 항상 새로 굽는다
  const remember = async (payload: CachedReading) => {
    if (kv && isValidOrderId(body.orderId)) await putCachedReading(kv, body.orderId, payload);
    return NextResponse.json(payload);
  };

  if (!process.env.ANTHROPIC_API_KEY) {
    // 실결제 주문에 샘플을 팔지 않는다 — 키 미설정 배포에서는 실패로 응답해 재시도를 유도하고,
    // "샘플 풀이"가 KV에 180일 캐시로 굳는 사고를 차단한다. mock은 개발 미리보기 전용.
    if (!DEV_UNLOCK) {
      return NextResponse.json({ error: "generation_failed", detail: "llm_key_missing" }, { status: 502 });
    }
    const reading = mockReading(saju, vessel, plan);
    return NextResponse.json({ reading, vessel: vessel.slug, mode: "mock", elements: getElements(saju) });
  }

  const payload = buildUserPayload(saju, vessel, plan);
  try {
    let reading = assembleReading(await generateDraft(payload), plan);
    let problem = validateReading(reading);
    if (problem) {
      reading = assembleReading(await generateDraft(payload, problem), plan);
      problem = validateReading(reading);
      if (problem) {
        return NextResponse.json({ error: "generation_failed", detail: problem }, { status: 502 });
      }
    }
    return remember({ reading, vessel: vessel.slug, mode: "live", elements: getElements(saju) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: "generation_failed", detail: msg }, { status: 502 });
  }
}
