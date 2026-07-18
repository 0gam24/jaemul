import { getSaju } from "../src/lib/manseryeok";
import { classifyVessel } from "../src/lib/vessel-types";

/**
 * 유형별 이론적 희귀도 산출 — 1950~2005 출생 공간 그리드 전수 계산.
 * 결과는 vessel-types.ts의 rarityPer100(100명 중 N명) 상수 근거가 된다.
 */
const dist: Record<string, number> = {};
let total = 0;
const start = Date.now();

for (let y = 1950; y <= 2005; y++) {
  for (let doy = 1; doy <= 365; doy += 3) {
    const d = new Date(Date.UTC(y, 0, doy));
    for (const h of [1, 5, 9, 13, 17, 21]) {
      for (const g of ["남", "여"] as const) {
        const v = classifyVessel(
          getSaju({
            year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate(),
            hour: h, minute: 0, gender: g,
          }).saju
        );
        dist[v.code] = (dist[v.code] ?? 0) + 1;
        total++;
      }
    }
  }
}

console.log(`샘플 ${total}개 · ${((Date.now() - start) / 1000).toFixed(1)}s`);
Object.entries(dist)
  .sort((a, b) => b[1] - a[1])
  .forEach(([code, n]) => {
    const pct = (100 * n) / total;
    console.log(`${code}  ${pct.toFixed(2)}%  → per100 = ${Math.max(1, Math.round(pct))}`);
  });
