import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { getSaju, type ManseInput } from "@/lib/manseryeok";
import { classifyVessel } from "@/lib/vessel-types";
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
 * - M3에서 결제 검증 + KV 캐시가 이 앞단에 붙는다
 */

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Body = { input: ManseInput };

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

  if (!process.env.ANTHROPIC_API_KEY) {
    const reading = mockReading(saju, vessel, plan);
    return NextResponse.json({ reading, vessel: vessel.slug, mode: "mock" });
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
    return NextResponse.json({ reading, vessel: vessel.slug, mode: "live" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.json({ error: "generation_failed", detail: msg }, { status: 502 });
  }
}
