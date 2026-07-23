import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// eslint-config-next 16은 flat config를 그대로 내보낸다.
// FlatCompat(구형 eslintrc 변환기)로 감싸면 설정 로딩 단계에서 순환참조로 죽는다.
const eslintConfig = defineConfig([
	...nextVitals,
	...nextTs,
	globalIgnores([".next/**", "out/**", "build/**", ".open-next/**", "next-env.d.ts", "cloudflare-env.d.ts"]),
]);

export default eslintConfig;
