"use client";

import actionStyles from "@/components/my-course-row-actions.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ActionIcon = "edit" | "share" | "delete" | "download";

const iconPaths: Record<ActionIcon, string> = {
  edit: "M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z",
  share: "M8.2 10.8 15.8 6.2M8.2 13.2l7.6 4.6",
  delete: "M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6",
  download: "M12 3v12m-5-5 5 5 5-5M4 20h16",
};

function Icon({ name }: { name: ActionIcon }) {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={iconPaths[name]} />
      {name === "share" && (
        <>
          <circle cx="6" cy="12" r="2.5" />
          <circle cx="18" cy="5" r="2.5" />
          <circle cx="18" cy="19" r="2.5" />
        </>
      )}
    </svg>
  );
}

export function MyCourseRowActions({
  id,
  name,
  published,
}: {
  id: number;
  name: string;
  published: boolean;
}) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function shareCourse() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/courses/${id}`,
      );
      window.dispatchEvent(
        new CustomEvent("running-course:toast", {
          detail: "공유 링크를 복사했어요",
        }),
      );
    } catch {
      window.dispatchEvent(
        new CustomEvent("running-course:toast", {
          detail: "주소 복사에 실패했어요. 코스 상세에서 링크를 복사해 주세요.",
        }),
      );
    }
  }

  async function deleteCourse() {
    setPending(true);
    setMessage("");
    try {
      const response = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.message ?? "코스를 삭제하지 못했어요.");
      }
      setConfirmDelete(false);
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "코스를 삭제하지 못했어요.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={actionStyles.actionCell}>
      <div className={actionStyles.actionButtons} aria-label={`${name} 관리`}>
        <Link
          className={actionStyles.actionButton}
          href={`/courses/${id}/edit`}
          aria-label={`${name} 수정`}
          title="수정"
        >
          <Icon name="edit" />
        </Link>
        <button
          className={actionStyles.actionButton}
          type="button"
          onClick={shareCourse}
          disabled={!published}
          aria-label={
            published
              ? `${name} 공유 링크 복사`
              : `${name}은 비공개라 공유할 수 없음`
          }
          title={
            published ? "공유 링크 복사" : "공개한 코스만 공유할 수 있어요"
          }
        >
          <Icon name="share" />
        </button>
        <button
          className={`${actionStyles.actionButton} ${actionStyles.deleteButton}`}
          type="button"
          onClick={() => setConfirmDelete(true)}
          aria-label={`${name} 삭제`}
          title="삭제"
        >
          <Icon name="delete" />
        </button>
        <button
          className={`${actionStyles.actionButton} ${actionStyles.downloadButton}`}
          type="button"
          disabled
          aria-label="코스 다운로드 · 준비 중"
          title="다운로드 기능 준비 중"
        >
          <Icon name="download" />
        </button>
      </div>
      {message && (
        <span
          className={actionStyles.actionStatus}
          role="status"
          aria-live="polite"
        >
          {message}
        </span>
      )}
      {confirmDelete && (
        <div className={actionStyles.dialogBackdrop}>
          <section
            className={actionStyles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={`delete-course-${id}`}
            aria-describedby={`delete-course-description-${id}`}
          >
            <h3 id={`delete-course-${id}`}>코스를 삭제할까요?</h3>
            <p id={`delete-course-description-${id}`}>
              “{name}” 코스와 찜 정보가 함께 삭제됩니다. 이 작업은 되돌릴 수
              없어요.
            </p>
            <div>
              <button
                type="button"
                className={actionStyles.cancelButton}
                onClick={() => setConfirmDelete(false)}
                disabled={pending}
              >
                취소
              </button>
              <button
                type="button"
                className={actionStyles.confirmDeleteButton}
                onClick={deleteCourse}
                disabled={pending}
              >
                {pending ? "삭제 중…" : "코스 삭제"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
