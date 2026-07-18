// OpenNext Windows 빌드 보정 — @vercel/og wasm 임포트 경로가 절대경로+역슬래시로
// 망가지는 문제를 실제 파일 위치(상대경로)로 교체한다. 빌드 후·배포 전에 실행.
// 사용: npx opennextjs-cloudflare build && node scripts/patch-og-wasm.mjs && npx wrangler deploy
import { readFileSync, writeFileSync } from "node:fs";

const p = ".open-next/server-functions/default/handler.mjs";
let s = readFileSync(p, "utf8");
const before = s;
s = s.replace(/import\("[^"]*?resvg\.wasm"\)/g, 'import("./node_modules/next/dist/compiled/@vercel/og/resvg.wasm")');
s = s.replace(/import\("[^"]*?yoga\.wasm"\)/g, 'import("./node_modules/next/dist/compiled/@vercel/og/yoga.wasm")');
if (s === before) {
  console.log("patch-og-wasm: 바꿀 것 없음 (이미 정상이거나 패턴 변경됨)");
} else {
  writeFileSync(p, s);
  console.log("patch-og-wasm: wasm 임포트 경로 보정 완료");
}
