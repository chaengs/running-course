"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./course-editor-guide.module.css";

const GUIDE_KEY = "running-course:course-editor-guide-seen";

const steps = [
  {
    target: "course-map",
    title: "지도에 마커를 찍어보세요",
    description:
      "달리고 싶은 길을 따라 지도를 클릭해 경로를 추가하세요. 마커 사이의 구간은 도보 경로로 자동 연결됩니다.",
    action: "서로 다른 경로점을 3개 이상 추가해 주세요.",
    icon: "pin",
  },
  {
    target: "course-map",
    title: "경로를 직접 편집해보세요",
    description:
      "마커를 드래그하면 위치를 옮길 수 있고, 더블클릭하면 마커를 삭제할 수 있습니다.",
    action: "마커 하나를 드래그하거나 더블클릭해 보세요.",
    icon: "edit",
  },
  {
    target: "course-map",
    title: "출발점과 도착점을 연결해요",
    description:
      "지도에서 첫 번째 마커 클릭하여 코스를 마무리합니다. 이 때 마커는 최소 3개가 있어야해요.",
    action: "출발점을 클릭해 코스를 연결해 주세요.",
    icon: "loop",
  },
] as const;

type GuideIcon = (typeof steps)[number]["icon"];
type SpotlightGeometry = {
  top: number;
  left: number;
  right: number;
  bottom: number;
  cardTop: number;
  cardLeft: number;
};

function overlaps(a: DOMRect, b: DOMRect) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

function StepIllustration({ icon }: { icon: GuideIcon }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      {icon === "pin" && (
        <>
          <path d="M16 29s-9-8.2-9-15a9 9 0 1 1 18 0c0 6.8-9 15-9 15Z" />
          <circle cx="16" cy="14" r="3" />
        </>
      )}
      {icon === "edit" && (
        <>
          <path d="m6 23 2-7L21 3l7 7-13 13-7 2Z" />
          <path d="m18 6 7 7M6 29h21" />
        </>
      )}
      {icon === "loop" && (
        <>
          <path d="M8 14a9 9 0 0 1 15-6l2 2m0-5v5h-5M24 18a9 9 0 0 1-15 6l-2-2m0 5v-5h5" />
          <circle cx="16" cy="16" r="2" />
        </>
      )}
    </svg>
  );
}

function getTarget(targetName: string) {
  return document.querySelector<HTMLElement>(`[data-tour="${targetName}"]`);
}

export function CourseEditorGuide({
  enabled = true,
  pointCount,
  isClosed,
  isRouting,
  editVersion,
}: {
  enabled?: boolean;
  pointCount: number;
  isClosed: boolean;
  isRouting: boolean;
  editVersion: number;
}) {
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [completedThrough, setCompletedThrough] = useState(-1);
  const [editBaseline, setEditBaseline] = useState(0);
  const [geometry, setGeometry] = useState<SpotlightGeometry | null>(null);
  const cardRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const step = steps[stepIndex];

  useEffect(() => {
    if (!enabled) return;
    const timer = window.setTimeout(() => {
      try {
        if (sessionStorage.getItem(GUIDE_KEY) !== "true") setOpen(true);
      } catch {
        setOpen(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  useEffect(() => {
    if (!open) return;
    const target = getTarget(step.target);
    if (!target) return;

    const previousPosition = target.style.position;
    const previousZIndex = target.style.zIndex;
    const previousTabIndex = target.getAttribute("tabindex");
    const previousHeight = target.style.height;
    const previousMarginTop = target.style.marginTop;
    targetRef.current = target;
    target.style.position = "relative";
    target.style.zIndex = "2101";
    if (step.target === "course-map" && window.innerWidth <= 940) {
      target.style.height = "clamp(220px, 35dvh, 300px)";
      const mapTop = target.getBoundingClientRect().top;
      target.style.marginTop = `${Math.max(0, 380 - mapTop)}px`;
    }
    if (
      previousTabIndex === null &&
      !(target instanceof HTMLButtonElement && target.disabled)
    ) {
      target.tabIndex = 0;
    }
    target.classList.add(styles.spotlightTarget);
    target.scrollIntoView({
      behavior: "smooth",
      block: step.target === "course-map" ? "nearest" : "center",
      inline: "nearest",
    });

    const updateGeometry = () => {
      const rect = target.getBoundingClientRect();
      const padding = 8;
      const top = Math.max(0, rect.top - padding);
      const left = Math.max(0, rect.left - padding);
      const right = Math.min(window.innerWidth, rect.right + padding);
      const bottom = Math.min(window.innerHeight, rect.bottom + padding);
      const card = cardRef.current;
      const cardWidth =
        card?.getBoundingClientRect().width ??
        Math.min(300, window.innerWidth - 32);
      const cardHeight = card?.getBoundingClientRect().height ?? 320;
      const mapRect = getTarget("course-map")?.getBoundingClientRect() ?? rect;
      const centerLeft = rect.left + rect.width / 2 - cardWidth / 2;
      const centerTop = rect.top + rect.height / 2 - cardHeight / 2;
      const candidates =
        step.target === "course-map"
          ? window.innerWidth <= 940
            ? [
                { left: centerLeft, top: top - cardHeight - 16 },
                { left: centerLeft, top: bottom + 16 },
                { left: mapRect.right + 16, top: centerTop },
                { left: mapRect.left - cardWidth - 16, top: centerTop },
              ]
            : [
                { left: mapRect.right + 16, top: centerTop },
                { left: mapRect.left - cardWidth - 16, top: centerTop },
                { left: centerLeft, top: top - cardHeight - 16 },
                { left: centerLeft, top: bottom + 16 },
              ]
          : [
              { left: centerLeft, top: bottom + 16 },
              { left: centerLeft, top: top - cardHeight - 16 },
              { left: rect.right + 16, top: centerTop },
              { left: rect.left - cardWidth - 16, top: centerTop },
            ];
      const fitsViewport = ({
        left,
        top: cardTop,
      }: {
        left: number;
        top: number;
      }) =>
        left >= 16 &&
        cardTop >= 16 &&
        left + cardWidth <= window.innerWidth - 16 &&
        cardTop + cardHeight <= window.innerHeight - 16;
      const candidate = candidates.find(({ left, top: cardTop }) => {
        if (!fitsViewport({ left, top: cardTop })) return false;
        const cardRect = new DOMRect(left, cardTop, cardWidth, cardHeight);
        return !overlaps(cardRect, rect) && !overlaps(cardRect, mapRect);
      }) ??
        candidates.find(
          ({ left, top: cardTop }) =>
            !overlaps(
              new DOMRect(left, cardTop, cardWidth, cardHeight),
              mapRect,
            ),
        ) ?? {
          left: Math.max(
            16,
            Math.min(centerLeft, window.innerWidth - cardWidth - 16),
          ),
          top: mapRect.top - cardHeight - 16,
        };
      const cardLeft = candidate.left;
      const cardTop = candidate.top;
      setGeometry({ top, left, right, bottom, cardTop, cardLeft });
    };

    let frame = window.requestAnimationFrame(updateGeometry);
    const onViewportChange = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateGeometry);
    };
    window.addEventListener("resize", onViewportChange);
    window.addEventListener("scroll", onViewportChange, true);
    const resizeObserver = new ResizeObserver(onViewportChange);
    resizeObserver.observe(target);
    titleRef.current?.focus({ preventScroll: true });

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", onViewportChange);
      window.removeEventListener("scroll", onViewportChange, true);
      resizeObserver.disconnect();
      target.classList.remove(styles.spotlightTarget);
      target.style.position = previousPosition;
      target.style.zIndex = previousZIndex;
      target.style.height = previousHeight;
      target.style.marginTop = previousMarginTop;
      if (previousTabIndex === null) target.removeAttribute("tabindex");
      else target.setAttribute("tabindex", previousTabIndex);
      targetRef.current = null;
    };
  }, [open, step]);

  useEffect(() => {
    if (open && geometry) titleRef.current?.focus({ preventScroll: true });
  }, [open, geometry, stepIndex]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        finishGuide();
      }
      if (event.key === "Tab") {
        const card = cardRef.current;
        if (!card) return;
        const focusableInCard = Array.from(
          card.querySelectorAll<HTMLElement>(
            "button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex='-1'])",
          ),
        );
        const target = targetRef.current;
        const focusableInTarget = target
          ? Array.from(
              target.querySelectorAll<HTMLElement>(
                "button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex='-1'])",
              ),
            )
          : [];
        const focusable = [
          ...focusableInCard,
          ...(target ? [target] : []),
          ...focusableInTarget,
        ];
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable.at(-1)!;
        if (!focusable.includes(document.activeElement as HTMLElement)) {
          event.preventDefault();
          (event.shiftKey ? last : first).focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  function finishGuide() {
    try {
      sessionStorage.setItem(GUIDE_KEY, "true");
    } catch {
      // The guide can still be closed when browser storage is unavailable.
    }
    setOpen(false);
    setGeometry(null);
    window.requestAnimationFrame(() =>
      openButtonRef.current?.focus({ preventScroll: true }),
    );
  }

  function nextStep() {
    if (stepIndex === 0) setEditBaseline(editVersion);
    setCompletedThrough((completed) => Math.max(completed, stepIndex));
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  }

  const canAdvance =
    completedThrough >= stepIndex ||
    (stepIndex === 0 && pointCount >= 3 && !isRouting) ||
    (stepIndex === 1 && editVersion > editBaseline && !isRouting) ||
    (stepIndex === 2 && isClosed && !isRouting);

  return (
    <>
      <button
        ref={openButtonRef}
        className={styles.openButton}
        type="button"
        onClick={() => {
          setStepIndex(0);
          setCompletedThrough(-1);
          setOpen(true);
        }}
      >
        사용 가이드
      </button>
      {open && geometry && (
        <div className={styles.tourLayer}>
          <div className={styles.shadeTop} style={{ height: geometry.top }} />
          <div
            className={styles.shadeBottom}
            style={{ top: geometry.bottom }}
          />
          <div
            className={styles.shadeLeft}
            style={{
              top: geometry.top,
              width: geometry.left,
              height: geometry.bottom - geometry.top,
            }}
          />
          <div
            className={styles.shadeRight}
            style={{
              top: geometry.top,
              left: geometry.right,
              height: geometry.bottom - geometry.top,
            }}
          />
        </div>
      )}
      {open &&
        geometry &&
        typeof document !== "undefined" &&
        createPortal(
          <section
            ref={cardRef}
            className={styles.tourCard}
            style={{ top: geometry.cardTop, left: geometry.cardLeft }}
            aria-labelledby="course-editor-guide-title"
            aria-describedby="course-editor-guide-description"
            aria-live="polite"
            role="dialog"
            aria-modal="false"
          >
            <div className={styles.cardHeading}>
              <span className={styles.stepIcon}>
                <StepIllustration icon={step.icon} />
              </span>
              <span className={styles.counter}>
                {stepIndex + 1} / {steps.length}
              </span>
              <button
                className={styles.closeButton}
                type="button"
                onClick={finishGuide}
                aria-label="사용 가이드 닫기"
              >
                ×
              </button>
            </div>
            <h2 ref={titleRef} id="course-editor-guide-title" tabIndex={-1}>
              {step.title}
            </h2>
            <p
              className={styles.description}
              id="course-editor-guide-description"
            >
              {step.description}
            </p>
            <p className={styles.actionHint}>{step.action}</p>
            <div className={styles.actions}>
              {stepIndex === 0 ? (
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={finishGuide}
                >
                  건너뛰기
                </button>
              ) : (
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => setStepIndex((index) => index - 1)}
                >
                  이전
                </button>
              )}
              {stepIndex < steps.length - 1 ? (
                <div className={styles.nextGroup}>
                  <button
                    className={styles.primaryButton}
                    type="button"
                    disabled={!canAdvance}
                    onClick={nextStep}
                  >
                    다음
                  </button>
                </div>
              ) : (
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={finishGuide}
                >
                  가이드 마치기
                </button>
              )}
            </div>
          </section>,
          document.body,
        )}
    </>
  );
}
