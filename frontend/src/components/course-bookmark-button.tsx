"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function CourseBookmarkButton({ courseId, initialBookmarked, refreshOnChange = false }: { courseId: number; initialBookmarked: boolean; refreshOnChange?: boolean }) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef(false);

  async function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/bookmarks/${courseId}`, { method: bookmarked ? "DELETE" : "PUT" });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || "북마크를 변경하지 못했어요.");
      }
      setBookmarked(!bookmarked);
      if (refreshOnChange) router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "연결을 확인하고 다시 시도해 주세요.");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  return <div className="course-bookmark">
    <button type="button" aria-pressed={bookmarked} disabled={pending} onClick={toggle}>
      {pending ? "변경 중…" : bookmarked ? "★ 북마크됨 · 해제" : "☆ 북마크"}
    </button>
    <p role="status" aria-live="polite">{error || (bookmarked ? "북마크에 저장한 코스예요." : "다시 달리고 싶은 코스를 북마크해 보세요.")}</p>
  </div>;
}
