import { ImageResponse } from "next/og";
import { vesselBySlug } from "@/lib/vessel-types";
import { normalizeMbti } from "@/lib/combo";
import { VesselCharacter } from "@/components/VesselCharacter";

/**
 * 공유 카드 이미지 (SPEC §1) — 정방형 1200×1200, ?story=1 → 1080×1920
 * 절대규칙 5: 생년월일시 절대 미노출 — 칭호·등급·태그라인만.
 */

export const dynamic = "force-dynamic";

let fontCache: ArrayBuffer | null = null;
/** 셀프호스팅 폰트(public/fonts) — Workers에선 Assets 바인딩, 로컬 dev에선 fs로 읽는다 */
async function loadFont(req: Request): Promise<ArrayBuffer> {
  if (fontCache) return fontCache;
  const fontPath = "/fonts/Pretendard-Bold.otf";
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const { env } = getCloudflareContext() as { env?: { ASSETS?: { fetch: (u: URL) => Promise<Response> } } };
    if (env?.ASSETS) {
      const res = await env.ASSETS.fetch(new URL(fontPath, req.url));
      if (res.ok) {
        fontCache = await res.arrayBuffer();
        return fontCache;
      }
    }
  } catch {
    /* 로컬 dev — 아래 fs 경로 사용 */
  }
  const { readFile } = await import("node:fs/promises");
  const path = await import("node:path");
  const buf = await readFile(path.join(process.cwd(), "public", fontPath));
  fontCache = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;
  return fontCache;
}


export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const sp = new URL(req.url).searchParams;
  const story = sp.get("story") === "1";
  const W = story ? 1080 : 1200;
  const H = story ? 1920 : 1200;

  // 홈(랜딩) 공유 카드 — 카톡 미리보기 최적화 가로형(1.91:1)
  // 훅 설계: 이미지="상위 ?%"(호기심 갭) / og:title=정체 / og:description=유형명 미끼 — 3층 역할 분담
  if (slug === "home") {
    const font = await loadFont(req);
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%", height: "100%", display: "flex", flexDirection: "row",
            alignItems: "center", backgroundColor: "#faf7f2", color: "#2b2118",
            fontFamily: "Pretendard", padding: "0 56px 0 36px",
          }}
        >
          <div style={{ display: "flex", width: 300, alignSelf: "flex-end", justifyContent: "center" }}>
            <VesselCharacter code="WROJ" size={290} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", marginLeft: 32 }}>
            <div style={{ display: "flex", fontSize: 66, letterSpacing: "-2px", lineHeight: 1.15 }}>
              내 재물그릇,
            </div>
            <div style={{ display: "flex", flexDirection: "row", alignItems: "baseline", marginTop: 4 }}>
              <div style={{ display: "flex", fontSize: 118, letterSpacing: "-4px", lineHeight: 1.05 }}>상위</div>
              <div style={{ display: "flex", fontSize: 140, color: "#d98e32", letterSpacing: "-6px", lineHeight: 1.05, marginLeft: 14 }}>?%</div>
            </div>
            <div
              style={{
                display: "flex", marginTop: 30, backgroundColor: "#f7e9d4", borderRadius: 999,
                padding: "10px 26px", fontSize: 28, color: "#b26e1b",
              }}
            >
              생년월일만 넣으면 10초 · 무료
            </div>
          </div>
        </div>
      ),
      { width: 800, height: 418, fonts: [{ name: "Pretendard", data: font, weight: 700 as const, style: "normal" as const }] }
    );
  }

  const vessel = vesselBySlug(slug);
  if (!vessel) return new Response("not found", { status: 404 });

  const mbti = sp.get("t") ? normalizeMbti(sp.get("t")!) : null;
  const mRaw = Number(sp.get("m"));
  const teaserMonth = Number.isInteger(mRaw) && mRaw >= 1 && mRaw <= 12 ? mRaw : null;
  const vsChallenge = sp.get("vs") === "1";
  const duelWith = sp.get("b") ? vesselBySlug(sp.get("b")!) : null;
  const font = await loadFont(req);

  // 대결 도전장 카드 — 받은 사람이 "붙어보자"에 반응하게
  if (vsChallenge) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%", height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            backgroundColor: "#faf7f2", color: "#2b2118", fontFamily: "Pretendard",
          }}
        >
          <div
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              backgroundColor: "#ffffff", borderRadius: 48, border: "3px solid #ece5da",
              padding: "80px 110px",
            }}
          >
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#b26e1b", letterSpacing: 6 }}>
              그릇 대결 도전장
            </div>
            <div style={{ display: "flex", marginTop: 36 }}>
              <VesselCharacter code={vessel.code} size={400} />
            </div>
            <div style={{ display: "flex", fontSize: 92, fontWeight: 800, marginTop: 30, letterSpacing: -2 }}>
              {vessel.name}
            </div>
            <div
              style={{
                display: "flex", marginTop: 40, padding: "18px 44px", borderRadius: 999,
                backgroundColor: "#f7e9d4", color: "#b26e1b", fontSize: 44, fontWeight: 800,
              }}
            >
              네 그릇이랑 붙어보자
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 56, fontSize: 34, color: "#a3968a" }}>
            생년월일만 넣으면 10초 · AI 재물그릇
          </div>
        </div>
      ),
      { width: W, height: H, fonts: [{ name: "Pretendard", data: font, weight: 700 as const, style: "normal" as const }] }
    );
  }

  // 대결 결과 카드 — 두 그릇 나란히
  if (duelWith) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%", height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            backgroundColor: "#faf7f2", color: "#2b2118", fontFamily: "Pretendard",
          }}
        >
          <div
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              backgroundColor: "#ffffff", borderRadius: 48, border: "3px solid #ece5da",
              padding: "80px 90px",
            }}
          >
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#b26e1b", letterSpacing: 6 }}>
              그릇 대결 결과
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 40, marginTop: 44 }}>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <VesselCharacter code={vessel.code} size={300} />
                <div style={{ display: "flex", fontSize: 56, fontWeight: 800, marginTop: 18 }}>{vessel.name}</div>
              </div>
              <div style={{ display: "flex", fontSize: 64, fontWeight: 800, color: "#a3968a" }}>vs</div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <VesselCharacter code={duelWith.code} size={300} />
                <div style={{ display: "flex", fontSize: 56, fontWeight: 800, marginTop: 18 }}>{duelWith.name}</div>
              </div>
            </div>
            <div
              style={{
                display: "flex", marginTop: 48, padding: "18px 44px", borderRadius: 999,
                backgroundColor: "#f7e9d4", color: "#b26e1b", fontSize: 44, fontWeight: 800,
              }}
            >
              결과는 링크에서 — 너도 붙어볼래?
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 56, fontSize: 34, color: "#a3968a" }}>
            내 그릇도 무료로 확인하기 · AI 재물그릇
          </div>
        </div>
      ),
      { width: W, height: H, fonts: [{ name: "Pretendard", data: font, weight: 700 as const, style: "normal" as const }] }
    );
  }

  // 유료 티저 카드 — 결제자의 "돈길 열리는 달"만 노출. 생년월일·풀이 내용 0%
  if (teaserMonth) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%", height: "100%", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            backgroundColor: "#faf7f2", color: "#2b2118",
            fontFamily: "Pretendard",
          }}
        >
          <div
            style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              backgroundColor: "#ffffff", borderRadius: 48,
              border: "3px solid #ece5da",
              padding: story ? "110px 90px" : "80px 110px",
            }}
          >
            <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#b26e1b", letterSpacing: 6 }}>
              내 돈길 열리는 달
            </div>
            <div style={{ display: "flex", marginTop: 30 }}>
              <VesselCharacter code={vessel.code} size={story ? 400 : 360} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", marginTop: 26 }}>
              <div style={{ display: "flex", fontSize: story ? 190 : 170, fontWeight: 800, color: "#d98e32", letterSpacing: -4 }}>
                {teaserMonth}월
              </div>
            </div>
            <div style={{ display: "flex", marginTop: 10, fontSize: 42, color: "#6f6257" }}>
              {vessel.name}의 사주로 계산한 달
            </div>
            <div
              style={{
                display: "flex", marginTop: 40, padding: "18px 44px", borderRadius: 999,
                backgroundColor: "#f7e9d4", color: "#b26e1b", fontSize: 44, fontWeight: 800,
              }}
            >
              네 돈길 달은 언제야?
            </div>
          </div>
          <div style={{ display: "flex", marginTop: 56, fontSize: 34, color: "#a3968a" }}>
            생년월일만 넣으면 무료 확인 · AI 재물그릇
          </div>
        </div>
      ),
      {
        width: W,
        height: H,
        fonts: [{ name: "Pretendard", data: font, weight: 700 as const, style: "normal" as const }],
      }
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          backgroundColor: "#faf7f2", color: "#2b2118",
          fontFamily: "Pretendard",
        }}
      >
        <div
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            backgroundColor: "#ffffff", borderRadius: 48,
            border: "3px solid #ece5da",
            padding: story ? "110px 90px" : "90px 110px",
          }}
        >
          <div style={{ display: "flex", fontSize: 34, fontWeight: 700, color: "#b26e1b", letterSpacing: 6 }}>
            나의 재물그릇
          </div>
          <div style={{ display: "flex", marginTop: 40 }}>
            <VesselCharacter code={vessel.code} size={story ? 430 : 400} />
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 22, marginTop: 36 }}>
            <div style={{ display: "flex", fontSize: mbti ? (story ? 92 : 84) : story ? 108 : 100, fontWeight: 800, letterSpacing: -2 }}>
              {vessel.name}
            </div>
            {mbti && (
              <div style={{ display: "flex", fontSize: story ? 66 : 60, fontWeight: 800, color: "#d98e32" }}>
                × {mbti}
              </div>
            )}
          </div>
          <div style={{ display: "flex", marginTop: 18, fontSize: 42, color: "#6f6257" }}>
            “{vessel.tagline}”
          </div>
          <div
            style={{
              display: "flex", marginTop: 44, padding: "18px 44px", borderRadius: 999,
              backgroundColor: "#f7e9d4", color: "#b26e1b", fontSize: 44, fontWeight: 800,
            }}
          >
            100명 중 {vessel.per100}명 나오는 그릇
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 56, fontSize: 34, color: "#a3968a" }}>
          내 그릇도 무료로 확인하기 · AI 재물그릇
        </div>
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [{ name: "Pretendard", data: font, weight: 700 as const, style: "normal" as const }],
    }
  );
}
