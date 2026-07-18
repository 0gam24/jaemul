/**
 * 계측 수집 엔드포인트 (M4)
 * 지금은 서버 로그로만 남긴다. 배포 시 Cloudflare Workers Analytics Engine
 * 또는 KV 카운터로 교체 (TODO M4 배포).
 * 프라이버시 강제: 허용 필드만 추출해 기록 — 그 외 키(생년월일 등)는 코드 레벨에서 폐기.
 */

const ALLOWED_EVENTS = new Set(["free_run", "share_click", "paid_view", "daily_view"]);
const ALLOWED_SOURCES = new Set(["threads", "share", "vs", "types", "daily", "paidshare", "direct"]);

function pick(v: unknown, max = 24): string | undefined {
  return typeof v === "string" && v.length > 0 && v.length <= max ? v : undefined;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    if (typeof body.e !== "string" || !ALLOWED_EVENTS.has(body.e)) {
      return new Response(null, { status: 400 });
    }
    // 화이트리스트 외 필드는 어떤 경로로 들어와도 기록하지 않는다
    const safe = {
      e: body.e,
      from: typeof body.from === "string" && ALLOWED_SOURCES.has(body.from) ? body.from : "direct",
      ts: typeof body.ts === "number" ? body.ts : undefined,
      kind: pick(body.kind),
      slug: pick(body.slug),
      mode: pick(body.mode),
    };
    console.log("[track]", JSON.stringify(safe));
  } catch {
    return new Response(null, { status: 400 });
  }
  return new Response(null, { status: 204 });
}
