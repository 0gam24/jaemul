import type { MetadataRoute } from "next";
import { VESSEL_TYPES } from "@/lib/vessel-types";

/**
 * 사이트맵 — 구글·네이버에 "우리 사이트에 이런 페이지가 있다"고 건네는 목록.
 *
 * 없으면 검색엔진이 첫 화면만 보고 유형 페이지 16개와 궁합 페이지 240개를 못 찾는다.
 * 그 페이지들이 이 서비스의 검색 유입 본체다.
 *
 * 넣지 않는 것: /p(유료 풀이)·/pay 계열. 본인 기기에서만 의미가 있는 개인 화면이고,
 * 검색 결과에 결제 화면이 뜨는 건 득이 없다.
 */

const BASE = "https://jaemul.kr";

export default function sitemap(): MetadataRoute.Sitemap {
  const slugs = Object.values(VESSEL_TYPES).map((v) => v.slug);
  const lastModified = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: BASE, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${BASE}/types`, lastModified, changeFrequency: "monthly", priority: 0.9 },
    { url: `${BASE}/today`, lastModified, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/input`, lastModified, changeFrequency: "monthly", priority: 0.8 },
  ];

  // 유형 페이지 16개 — 검색 유입의 1순위 ("가마솥형", "옹달샘형" 같은 고유 명칭)
  for (const slug of slugs) {
    pages.push({ url: `${BASE}/r/${slug}`, lastModified, changeFrequency: "monthly", priority: 0.9 });
  }

  // 대결 입구 16개
  for (const slug of slugs) {
    pages.push({ url: `${BASE}/vs/${slug}`, lastModified, changeFrequency: "monthly", priority: 0.7 });
  }

  // 궁합 조합 240개 — "A형 vs B형" 롱테일 검색을 받는 자리
  for (const a of slugs) {
    for (const b of slugs) {
      if (a === b) continue;
      pages.push({ url: `${BASE}/vs/${a}/${b}`, lastModified, changeFrequency: "monthly", priority: 0.5 });
    }
  }

  for (const path of ["terms", "privacy", "refund"]) {
    pages.push({ url: `${BASE}/${path}`, lastModified, changeFrequency: "yearly", priority: 0.3 });
  }

  return pages;
}
