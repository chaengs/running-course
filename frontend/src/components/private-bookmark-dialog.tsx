"use client";

import styles from "@/components/private-bookmark-dialog.module.css";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function ConfirmationDialog({
  title,
  description,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const portalTarget = useSyncExternalStore(
    () => () => {},
    () => document.body,
    () => null,
  );

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    return () => previouslyFocusedRef.current?.focus();
  }, []);

  useEffect(() => {
    if (portalTarget) cancelRef.current?.focus();
  }, [portalTarget]);

  if (!portalTarget) return null;

  return createPortal(
    <div className={styles.backdrop}>
      <section
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="private-bookmark-title"
        aria-describedby="private-bookmark-description"
        onKeyDown={(event) => {
          if (event.key === "Escape" && !pending) onCancel();
          if (event.key !== "Tab") return;
          if (event.shiftKey && document.activeElement === cancelRef.current) {
            event.preventDefault();
            confirmRef.current?.focus();
          } else if (!event.shiftKey && document.activeElement === confirmRef.current) {
            event.preventDefault();
            cancelRef.current?.focus();
          }
        }}
      >
        <h2 id="private-bookmark-title">{title}</h2>
        <p id="private-bookmark-description" className={styles.description}>
          {description}
        </p>
        <div className={styles.actions}>
          <button
            ref={cancelRef}
            type="button"
            className={styles.cancelButton}
            onClick={onCancel}
            disabled={pending}
          >
            취소
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={styles.confirmButton}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? "처리 중…" : confirmLabel}
          </button>
        </div>
      </section>
    </div>,
    portalTarget,
  );
}
