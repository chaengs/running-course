"use client";
import ownerStyles from "@/components/course-owner-actions.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
export function CourseOwnerActions({ id }: { id: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const locked = useRef(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  async function removeCourse() {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await response.json()).message);
      router.replace("/my/courses");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "다시 시도해 주세요.",
      );
    } finally {
      locked.current = false;
      setPending(false);
    }
  }
  return (
    <section className={ownerStyles.ownerActions} aria-label="내 코스 관리">
      <Link className={ownerStyles.editIconButton} href={`/courses/${id}/edit`}>
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M12 20h9" />
          <path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z" />
        </svg>
        <span>코스 수정</span>
      </Link>
      <button
        className={ownerStyles.deleteIconButton}
        type="button"
        disabled={pending}
        onClick={() => setConfirmDelete(!confirmDelete)}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <path d="M4 7h16M10 11v6m4-6v6M5 7l1 14h12l1-14M9 7V4h6v3" />
        </svg>
        <span>코스 삭제</span>
      </button>
      {confirmDelete && (
        <div className={ownerStyles.deleteConfirm} role="alert">
          <p>이 코스를 영구 삭제할까요?</p>
          <button
            type="button"
            disabled={pending}
            onClick={() => removeCourse()}
          >
            삭제
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setConfirmDelete(false)}
          >
            취소
          </button>
        </div>
      )}
      <p role="status">{message}</p>
    </section>
  );
}
export function ShareCourseButton({ className = "" }: { className?: string }) {
  return (
    <div className={ownerStyles.shareControl}>
      <button
        type="button"
        className={`${ownerStyles.shareButton} ${className}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              `${window.location.origin}${window.location.pathname}`,
            );
            window.dispatchEvent(
              new CustomEvent("running-course:toast", {
                detail: "공유 링크를 복사했어요",
              }),
            );
          } catch {
            window.dispatchEvent(
              new CustomEvent("running-course:toast", {
                detail: "주소 복사에 실패했어요. 주소창에서 링크를 복사해 주세요.",
              }),
            );
          }
        }}
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        >
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <path d="m8.7 10.7 6.6-4.4M8.7 13.3l6.6 4.4" />
        </svg>
        링크 공유
      </button>
    </div>
  );
}
