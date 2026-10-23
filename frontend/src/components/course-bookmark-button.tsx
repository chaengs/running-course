"use client";
import bookmarkStyles from "@/components/course-bookmark-button.module.css";
import { ConfirmationDialog } from "@/components/private-bookmark-dialog";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
export function CourseBookmarkButton({ courseId, initialBookmarked, bookmarkCount, privateCourse = false, refreshOnChange = false, className = "" }: {
    courseId: number;
    initialBookmarked: boolean;
    bookmarkCount?: number;
    privateCourse?: boolean;
    refreshOnChange?: boolean;
    className?: string;
}) {
    const router = useRouter();
    const [bookmarked, setBookmarked] = useState(initialBookmarked);
    const [count, setCount] = useState(bookmarkCount);
    const [pending, setPending] = useState(false);
    const [error, setError] = useState("");
    const [confirmPrivateUnbookmark, setConfirmPrivateUnbookmark] = useState(false);
    const inFlight = useRef(false);
    async function updateBookmark(nextBookmarked: boolean) {
        if (inFlight.current)
            return;
        inFlight.current = true;
        setPending(true);
        setError("");
        try {
            const response = await fetch(`/api/bookmarks/${courseId}`, { method: nextBookmarked ? "PUT" : "DELETE" });
            if (!response.ok) {
                const body = await response.json();
                throw new Error(body.message || "찜 상태를 변경하지 못했어요.");
            }
            setBookmarked(nextBookmarked);
            setCount((current) => current === undefined ? current : Math.max(0, current + (nextBookmarked ? 1 : -1)));
            setConfirmPrivateUnbookmark(false);
            if (privateCourse && !nextBookmarked) {
                router.replace("/my/bookmarks");
            }
            else if (refreshOnChange)
                router.refresh();
        }
        catch (cause) {
            setError(cause instanceof Error ? cause.message : "연결을 확인하고 다시 시도해 주세요.");
        }
        finally {
            inFlight.current = false;
            setPending(false);
        }
    }
    function toggle() {
        if (inFlight.current)
            return;
        if (bookmarked && privateCourse) {
            setConfirmPrivateUnbookmark(true);
            return;
        }
        void updateBookmark(!bookmarked);
    }
    return <div className={bookmarkStyles.courseBookmark + " " + className}>
    <button type="button" aria-pressed={bookmarked} disabled={pending} onClick={toggle}>
      <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill={bookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8"><path d="M20.8 8.8c0 5.2-8.8 10.4-8.8 10.4S3.2 14 3.2 8.8A4.8 4.8 0 0 1 12 6.1a4.8 4.8 0 0 1 8.8 2.7Z"/></svg>찜{count !== undefined ? ` ${count}` : ""}
    </button>
    <p role="status" aria-live="polite">{error}</p>
    {confirmPrivateUnbookmark && <ConfirmationDialog title="찜을 해제할까요?" description="이 코스는 비공개 상태예요. 찜을 해제하면 작성자가 다시 공개할 때까지 볼 수 없어요." confirmLabel="찜 해제" pending={pending} onCancel={() => setConfirmPrivateUnbookmark(false)} onConfirm={() => void updateBookmark(false)} />}
  </div>;
}
