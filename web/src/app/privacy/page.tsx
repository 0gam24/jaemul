import type { Metadata } from "next";

export const metadata: Metadata = { title: "개인정보처리방침 — 재물그릇" };

/** 개인정보처리방침 (M3) — "생년월일 서버 미저장" 구조를 그대로 문서화 */
export default function PrivacyPage() {
  return (
    <div className="px-6 pt-10 pb-12 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
      <h1 className="text-[22px] font-extrabold" style={{ color: "var(--ink)" }}>개인정보처리방침</h1>

      <Sec title="1. 수집하는 정보">
        ① 생년월일시·성별: 재물그릇 계산에 사용됩니다. <b>회사 서버·데이터베이스에 저장하지
        않으며</b>, 이용자 기기(브라우저 저장소)에만 보관되어 본인 재열람에 사용됩니다.
        ② 유료 풀이 생성 시 사주 계산값(간지·십성 등)이 AI 처리 위탁사(Anthropic)에 전달되며,
        생년월일·출생시각 원문은 전달 전 제거됩니다. ③ 결제 정보: 토스페이먼츠가 직접 수집·처리하며
        회사는 카드번호 등 결제 원문 정보를 보관하지 않습니다. 회사는 주문번호·금액·승인시각만
        보관합니다.
      </Sec>
      <Sec title="2. 이용 목적">콘텐츠 생성, 결제 처리, 서비스 개선을 위한 비식별 통계(방문 경로 등).</Sec>
      <Sec title="3. 보유 기간">
        기기 저장 정보는 이용자가 브라우저 데이터를 삭제하면 즉시 파기됩니다. 결제 기록(주문번호·금액)은
        전자상거래법에 따라 5년간 보관 후 파기합니다.
      </Sec>
      <Sec title="4. 제3자 제공·위탁">
        결제 처리: 토스페이먼츠 / AI 콘텐츠 생성: Anthropic (생년월일 원문 미포함). 이 외에 개인정보를
        제3자에게 제공하지 않습니다.
      </Sec>
      <Sec title="5. 이용자의 권리">
        기기 저장 정보는 브라우저 설정에서 직접 삭제할 수 있습니다. 결제 기록 관련 문의는 아래
        연락처로 요청하실 수 있습니다.
      </Sec>
      <Sec title="6. 개인정보 보호책임자">
        김준혁 · smartdatashop@gmail.com
      </Sec>
      <Sec title="부칙">본 방침은 2026년 7월 18일부터 적용됩니다.</Sec>
    </div>
  );
}

function Sec({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-1.5 text-[15px] font-bold" style={{ color: "var(--ink)" }}>{title}</h2>
      <p>{children}</p>
    </section>
  );
}
