import * as fs from "fs";
import { buildMonthPlan } from "../src/lib/reading";

const plan = buildMonthPlan(
  { year: 1991, month: 7, day: 23, hour: 10, minute: 30, gender: "여" },
  new Date(2026, 6, 17)
);
const lines = [
  plan.daeunLine,
  ...plan.cells.map((c) => `${c.year}.${String(c.month).padStart(2, "0")} ${c.ganzhi} ${c.tengod} lv${c.level}`),
];
fs.writeFileSync(__dirname + "/../../.claude-plan.txt", lines.join("\n"), "utf-8");
console.log("saved");
