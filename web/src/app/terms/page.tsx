import type { Metadata } from "next";

export const metadata: Metadata = { title: "이용약관 — 재물그릇" };

/** 이용약관 (M3) — 전자상거래법·콘텐츠산업진흥법 기준 최소 구성 */
export default function TermsPage() {
  return (
    <div className="px-6 pt-10 pb-12 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
      <h1 className="text-[22px] font-extrabold" style={{ color: "var(--ink)" }}>이용약관</h1>

      <Sec title="제1조 (목적)">
        이 약관은 스마트데이터샵(이하 &quot;회사&quot;)이 제공하는 AI 재물운 콘텐츠 서비스
        &quot;재물그릇&quot;(이하 &quot;서비스&quot;)의 이용 조건을 정합니다.
      </Sec>
      <Sec title="제2조 (서비스의 성격)">
        ① 본 서비스의 모든 결과물은 만세력 계산과 인공지능(AI)이 생성한 콘텐츠이며, 재미와
        참고 목적으로 제공됩니다. ② 서비스는 투자·의료·법률 등 전문적 조언을 제공하지 않으며,
        이용자의 의사결정 결과에 대해 책임지지 않습니다.
      </Sec>
      <Sec title="제3조 (이용 계약)">
        ① 서비스는 회원가입 없이 이용합니다. ② 유료 콘텐츠(상세 풀이)는 결제 완료 시 즉시
        제공되며, 구매 내역은 결제 기기에서 다시 열람할 수 있습니다.
      </Sec>
      <Sec title="제4조 (개인정보)">
        입력한 생년월일시는 결과 계산에만 사용되며 회사 서버에 저장되지 않습니다. 자세한 내용은
        개인정보처리방침을 따릅니다.
      </Sec>
      <Sec title="제5조 (청약철회)">
        유료 콘텐츠는 구매 즉시 제공되는 디지털콘텐츠로, 제공이 개시된(열람한) 후에는
        전자상거래법 제17조 제2항에 따라 청약철회가 제한됩니다. 상세 기준은 환불정책을 따릅니다.
      </Sec>
      <Sec title="제6조 (금지 행위)">
        자동화 도구를 이용한 대량 요청, 콘텐츠 무단 복제·재판매, 서비스 운영 방해 행위를 금지합니다.
      </Sec>
      <Sec title="부칙">본 약관은 2026년 7월 18일부터 적용됩니다.</Sec>
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
