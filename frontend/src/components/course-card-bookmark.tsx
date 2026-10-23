"use client";

import styles from "@/components/course-card-bookmark.module.css";
import { ConfirmationDialog } from "@/components/private-bookmark-dialog";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function CourseCardBookmark({
  courseId,
  initialBookmarked,
  privateCourse = false,
  refreshOnChange = false,
}: {
  courseId: number;
  initialBookmarked: boolean;
  privateCourse?: boolean;
  refreshOnChange?: boolean;
}) {
  const router = useRouter();
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [confirmPrivateUnbookmark, setConfirmPrivateUnbookmark] =
    useState(false);

  async function updateBookmark(nextBookmarked: boolean) {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const response = await fetch(`/api/bookmarks/${courseId}`, {
        method: nextBookmarked ? "PUT" : "DELETE",
      });
      if (response.status === 401) {
        router.push("/login");
        return;
      }
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || "찜 상태를 변경하지 못했어요.");
      }
      setBookmarked(nextBookmarked);
      setConfirmPrivateUnbookmark(false);
      if (refreshOnChange) router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "찜 상태를 변경하지 못했어요.",
      );
    } finally {
      setPending(false);
    }
  }

  function toggleBookmark() {
    if (pending) return;
    if (bookmarked && privateCourse) {
      setConfirmPrivateUnbookmark(true);
      return;
    }
    void updateBookmark(!bookmarked);
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
        <svg
          viewBox="0 0 24 24"
          aria-hidden="true"
          fill={bookmarked ? "currentColor" : "none"}
        >
          <path d="M20.8 8.8c0 5.2-8.8 10.4-8.8 10.4S3.2 14 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z" />
        </svg>
      </button>
      <span className={styles.srOnly} role="status" aria-live="polite">
        {error}
      </span>
      {confirmPrivateUnbookmark && (
        <ConfirmationDialog
          title="찜을 해제할까요?"
          description="이 코스는 비공개 상태예요.\n찜을 해제하면 작성자가 다시 공개할 때까지 볼 수 없어요."
          confirmLabel="찜 해제"
          pending={pending}
          onCancel={() => setConfirmPrivateUnbookmark(false)}
          onConfirm={() => void updateBookmark(false)}
        />
      )}
    </>
  );
}
