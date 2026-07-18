import type { Metadata } from "next";

export const metadata: Metadata = { title: "환불정책 — 재물그릇" };

/** 환불정책 (M3) — 전자상거래법 제17조 디지털콘텐츠 기준 */
export default function RefundPage() {
  return (
    <div className="px-6 pt-10 pb-12 text-[14px] leading-relaxed" style={{ color: "var(--ink-soft)" }}>
      <h1 className="text-[22px] font-extrabold" style={{ color: "var(--ink)" }}>환불정책</h1>

      <Sec title="1. 환불이 가능한 경우">
        ① 결제 후 <b>콘텐츠를 열람하지 않은 경우</b>: 결제일로부터 7일 이내 전액 환불.
        ② 시스템 오류로 콘텐츠가 정상 제공되지 않은 경우: 전액 환불.
        ③ 중복 결제: 중복분 전액 환불.
      </Sec>
      <Sec title="2. 환불이 제한되는 경우">
        상세 풀이는 결제 즉시 이용자 사주로 생성·제공되는 디지털콘텐츠입니다. <b>열람(제공 개시)
        후에는</b> 전자상거래법 제17조 제2항 제5호에 따라 청약철회가 제한됩니다. 이 내용은 결제
        전 화면에서 고지하며 동의를 받습니다. 무료 결과 카드로 콘텐츠의 성격을 미리 확인하실 수
        있습니다.
      </Sec>
      <Sec title="3. 환불 방법">
        smartdatashop@gmail.com 으로 주문번호와 함께 요청해 주세요. 접수 후 3영업일 이내 결제 수단으로
        환불됩니다.
      </Sec>
      <Sec title="부칙">본 정책은 2026년 7월 18일부터 적용됩니다.</Sec>
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
