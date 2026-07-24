/**
 * 실제 LLM 생성 1회 테스트 — /api/reading의 live 경로를 그대로 재현.
 * 실행: npx tsx --env-file=.env.local scripts/dump-live.ts
 */
import Anthropic from "@anthropic-ai/sdk";
import { getSaju } from "../src/lib/manseryeok";
import { classifyVessel } from "../src/lib/vessel-types";
import {
  READING_SYSTEM,
  READING_SCHEMA,
  buildMonthPlan,
  buildUserPayload,
  assembleReading,
  validateReading,
  type LlmDraft,
} from "../src/lib/reading";

// 인자: year month day hour minute gender (생략 시 1991.7.23 10:30 여)
const [y, m, d, h, mi, g] = process.argv.slice(2);
const input = {
  year: Number(y) || 1991,
  month: Number(m) || 7,
  day: Number(d) || 23,
  hour: h !== undefined ? Number(h) : 10,
  minute: mi !== undefined ? Number(mi) : 30,
  gender: (g === "남" ? "남" : "여") as "남" | "여",
};

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
    system: [{ type: "text", text: READING_SYSTEM, cache_control: { type: "ephemeral" } }],
    messages: [
      { role: "user", content: retryNote ? `${payload}\n\n[재생성 사유 — 반드시 수정] ${retryNote}` : payload },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error("reading_refused");
  console.error("[usage]", JSON.stringify(response.usage));
  const text = response.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("no_text_output");
  return JSON.parse(text.text) as LlmDraft;
}

async function main() {
  const { saju } = getSaju(input);
  const vessel = classifyVessel(saju);
  const kst = new Date(Date.now() + 9 * 3600 * 1000);
  const plan = buildMonthPlan(input, new Date(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()));
  const payload = buildUserPayload(saju, vessel, plan);

  const t0 = Date.now();
  let retried = false;
  let reading = assembleReading(await generateDraft(payload), plan);
  let problem = validateReading(reading);
  if (problem) {
    retried = true;
    console.error("[재생성]", problem);
    reading = assembleReading(await generateDraft(payload, problem), plan);
    problem = validateReading(reading);
    if (problem) throw new Error(`최종 실패: ${problem}`);
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1);

  const md = [
    `# 실제 생성 샘플 — ${vessel.name} (${input.year}.${input.month}.${input.day} ${input.gender})`,
    `생성 ${secs}초 / 재생성 ${retried ? "1회" : "없음"} / 가드레일 통과`,
    ``,
    `## 공유 팩폭 한 줄`, `"${reading.shareLine}"`,
    ``,
    `## 요약`, reading.summary,
    ``,
    `## 재물 구조 (${reading.structure.length}자)`, reading.structure,
    ``,
    `## 대운 흐름 (${reading.flow.length}자)`, reading.flow,
    ``,
    `## 월 캘린더`,
    `| 월 | 간지 | 십성 | level | 노트 |`,
    `|---|---|---|---|---|`,
    ...reading.months.map((m) => `| ${m.year}.${m.month} | ${m.ganzhi} | ${m.tengod} (${m.label}) | ${m.level} | ${m.note} |`),
    ``,
    `## 행동 3가지`,
    ...reading.actions.map((a) => `- ${a}`),
    ``,
    `## 궁합 브릿지`, reading.synergyNote ?? "(없음)",
    ...(reading.caution ? [``, `## 지출 구멍 (v1 캐시)`, reading.caution] : []),
  ].join("\n");
  console.log(md);
}

main().catch((e) => {
  console.error("FAILED:", e);
  process.exit(1);
});
