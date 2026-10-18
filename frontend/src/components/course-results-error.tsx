"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function CourseResultsError() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return <section className="list-section" aria-label="코스 검색 결과">
    <div className="empty-state" role="alert">
      <h2>코스를 불러오지 못했어요</h2>
      <p>검색 조건을 바꾸거나 잠시 후 다시 시도해 주세요.</p>
      <button type="button" className="button-primary" disabled={pending} onClick={() => startTransition(() => router.refresh())}>
        {pending ? "다시 불러오는 중…" : "다시 시도"}
      </button>
    </div>
  </section>;
}
