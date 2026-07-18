import * as fs from "fs";
import { getSaju } from "../src/lib/manseryeok";
import { classifyVessel } from "../src/lib/vessel-types";

const { saju } = getSaju({ year: 1991, month: 7, day: 23, hour: 10, minute: 30, gender: "여" });
const v = classifyVessel(saju);
const out = `[유형] ${v.name} — ${v.tagline} / 팩폭: ${v.fact}\n${saju.toCompact()}`;
fs.writeFileSync(__dirname + "/../../.claude-sample-saju.txt", out, "utf-8");
console.log("saved, length:", out.length);
