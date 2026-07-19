import { ImageResponse } from "next/og";
import { VesselCharacter } from "@/components/VesselCharacter";

/** iOS 홈 화면 아이콘 — iOS가 자체적으로 모서리를 깎으므로 radius 없음 */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex",
          alignItems: "center", justifyContent: "center",
          backgroundColor: "#faf7f2",
        }}
      >
        <VesselCharacter code="WROJ" size={140} />
      </div>
    ),
    size
  );
}
