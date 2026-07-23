import Image from "next/image";
import { VESSEL_TYPES, type VesselCode } from "@/lib/vessel-types";

/**
 * 프리미엄 캐릭터 (public/premium/*.png, 512px 투명 배경) — 사이트 전역의 캐릭터 표준.
 *
 * AI 생성 3D 렌더 16종. next/image가 Cloudflare Images(IMAGES 바인딩)를 통해
 * 표시 크기에 맞는 webp로 최적화해 내려주므로 LCP 게이트를 지킨다.
 * (예: 58px 그리드 셀은 512px 원본이 아니라 ~10KB급 썸네일로 전송)
 *
 * SVG 원본(VesselCharacter)은 satori 전용(OG 카드·파비콘)으로만 남긴다 —
 * satori는 래스터 next/image를 렌더할 수 없다.
 */
export function PremiumVessel({
  code,
  size,
  priority = false,
}: {
  code: VesselCode;
  size: number;
  priority?: boolean;
}) {
  const v = VESSEL_TYPES[code];
  return (
    <Image
      src={`/premium/${v.slug}.png`}
      width={size}
      height={size}
      alt={`${v.name} 캐릭터`}
      priority={priority}
    />
  );
}
