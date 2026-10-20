"use client";
import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import Link from "next/link";
import { useTransition } from "react";
export default function CourseDetailError({
  retry,
}: {
  error: Error & {
    digest?: string;
  };
  retry: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <main id="main-content" className={layoutStyles.errorPage}>
      <section
        className={uiStyles.emptyState}
        role="alert"
        aria-labelledby="detail-error-title"
      >
        <span className={uiStyles.stateSymbol} aria-hidden="true">
          !
        </span>
        <h1 id="detail-error-title">코스 상세를 불러오지 못했어요</h1>
        <p>잠시 후 다시 시도해 주세요.</p>
        <div className={uiStyles.errorActions}>
          <button
            className={uiStyles.buttonPrimary}
            disabled={pending}
            onClick={() => startTransition(() => retry())}
          >
            {pending ? "다시 불러오는 중…" : "다시 시도"}
          </button>
          <Link className={uiStyles.backLink} href="/">
            코스 목록으로
          </Link>
        </div>
      </section>
    </main>
  );
}
