import { getSaju } from "../src/lib/manseryeok";
import { classifyVessel } from "../src/lib/vessel-types";

const dist: Record<string, number> = {};
let total = 0;
for (let y = 1970; y <= 2005; y++) {
  for (const [m, d, h] of [[1, 5, 2], [2, 14, 6], [3, 21, 8], [5, 5, 11], [6, 10, 14], [8, 1, 17], [9, 28, 20], [11, 11, 22], [12, 15, 23]] as const) {
    for (const g of ["남", "여"] as const) {
      const v = classifyVessel(getSaju({ year: y, month: m, day: d, hour: h, minute: 0, gender: g }).saju);
      const key = `${v.code} ${v.name}`;
      dist[key] = (dist[key] ?? 0) + 1;
      total++;
    }
  }
}
console.log("샘플", total);
Object.entries(dist)
  .sort((a, b) => b[1] - a[1])
  .forEach(([k, v]) => console.log(k.padEnd(14), String(v).padStart(4), ((100 * v) / total).toFixed(1) + "%"));
