// 유료 풀이 시연용 — LLM에 실제로 전달되는 유저 페이로드 전문을 덤프한다 (샘플 사주)
import * as fs from "fs";
import { getSaju } from "../src/lib/manseryeok";
import { classifyVessel } from "../src/lib/vessel-types";
import { buildMonthPlan, buildUserPayload } from "../src/lib/reading";

const input = { year: 1979, month: 12, day: 13, hour: 7, minute: 30, gender: "남" as const };
const { saju } = getSaju(input);
const vessel = classifyVessel(saju);
const plan = buildMonthPlan(input, new Date(2026, 6, 23));
const payload = buildUserPayload(saju, vessel, plan);
fs.writeFileSync(__dirname + "/../../demo-payload.txt", payload, "utf-8");
console.log("vessel:", vessel.code, vessel.name, "| age:", saju.currentAge);
