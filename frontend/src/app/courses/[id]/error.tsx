"use client";

import Link from "next/link";
import { useTransition } from "react";

export default function CourseDetailError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <main id="main-content" className="error-page">
      <section className="empty-state" role="alert" aria-labelledby="detail-error-title">
        <span className="state-symbol" aria-hidden="true">!</span>
        <h1 id="detail-error-title">코스 상세를 불러오지 못했어요</h1>
        <p>잠시 후 다시 시도해 주세요.</p>
        <div className="error-actions"><button className="button-primary" disabled={pending} onClick={() => startTransition(() => retry())}>{pending ? "다시 불러오는 중…" : "다시 시도"}</button><Link className="back-link" href="/">코스 목록으로</Link></div>
      </section>
    </main>
  );
}
