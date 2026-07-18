import { getSaju } from "../src/lib/manseryeok";

const scores: number[] = [];
const wealth: number[] = [];
const output: number[] = [];
const pjDiff: number[] = [];

for (let y = 1970; y <= 2005; y++) {
  for (const [m, d, h] of [[1, 5, 2], [2, 14, 6], [3, 21, 8], [5, 5, 11], [6, 10, 14], [8, 1, 17], [9, 28, 20], [11, 11, 22], [12, 15, 23]] as const) {
    for (const g of ["남", "여"] as const) {
      const { saju } = getSaju({ year: y, month: m, day: d, hour: h, minute: 0, gender: g });
      scores.push(saju.advanced.dayStrength.score);
      const slots: string[] = [];
      (["year", "month", "day", "hour"] as const).forEach((p) => {
        const t = saju.tenGods[p];
        if (p !== "day") slots.push(t.stem);
        slots.push(t.branch);
      });
      wealth.push(slots.filter((s) => s === "정재" || s === "편재").length);
      output.push(slots.filter((s) => s === "식신" || s === "상관").length);
      pjDiff.push(slots.filter((s) => s === "편재").length - slots.filter((s) => s === "정재").length);
    }
  }
}

function pct(arr: number[], p: number) {
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.floor((s.length - 1) * p)];
}
function hist(arr: number[], label: string) {
  const h: Record<number, number> = {};
  arr.forEach((v) => (h[v] = (h[v] ?? 0) + 1));
  console.log(label, Object.entries(h).sort((a, b) => +a[0] - +b[0]).map(([k, v]) => `${k}:${((100 * v) / arr.length).toFixed(0)}%`).join(" "));
}

console.log("dayStrength.score p10/25/50/75/90:", [0.1, 0.25, 0.5, 0.75, 0.9].map((p) => pct(scores, p)).join(" / "));
hist(wealth, "재성 개수  ");
hist(output, "식상 개수  ");
hist(pjDiff, "편재-정재 차");
