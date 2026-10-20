"use client";

import styles from "@/components/course-card-bookmark.module.css";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CourseCardBookmark({ courseId, initialBookmarked }: { courseId: number; initialBookmarked: boolean }) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function toggleBookmark() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/bookmarks/${courseId}`, {
        method: bookmarked ? "DELETE" : "PUT",
      });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || "찜 상태를 변경하지 못했어요.");
      }
      setBookmarked((current) => !current);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "찜 상태를 변경하지 못했어요.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        className={styles.bookmarkButton}
        type="button"
        aria-label={bookmarked ? "찜 해제" : "코스 찜하기"}
        aria-pressed={bookmarked}
        aria-busy={pending}
        disabled={pending}
        onClick={toggleBookmark}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" fill={bookmarked ? "currentColor" : "none"}>
          <path d="M20.8 8.8c0 5.2-8.8 10.4-8.8 10.4S3.2 14 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" />
        </svg>
      </button>
      <span className={styles.srOnly} role="status" aria-live="polite">{error}</span>
    </>
  );
}
