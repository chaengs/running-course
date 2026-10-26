"use client";

import styles from "@/components/home-service-intro.module.css";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const DISMISS_KEY = "running-course:home-intro-dismissed";
const CHANGE_EVENT = "running-course:home-intro-dismissed-change";

const slides = [
  {
    title: "나만의 러닝 코스를 만들어요",
    description: "지도에 경로를 그려 저장하고, 다른 러너와 공유해 보세요.",
  },
  {
    title: "새로운 코스를 발견해요",
    description: "다른 러너들이 만든 다양한 러닝 코스를 둘러보세요.",
  },
  {
    title: "마음에 드는 코스를 찜해요",
    description: "찜한 코스를 모아두고 언제든 다시 확인할 수 있어요.",
  },
] as const;

let dismissedInMemory = false;

function subscribeToDismissal(onChange: () => void) {
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => window.removeEventListener(CHANGE_EVENT, onChange);
}

function getDismissedSnapshot() {
  try {
    return dismissedInMemory || sessionStorage.getItem(DISMISS_KEY) === "true";
  } catch {
    return dismissedInMemory;
  }
}

function getServerDismissedSnapshot() {
  // Render the client-only intro after hydration to avoid showing it to crawlers
  // or flashing it for a session that has already dismissed the intro.
  return true;
}

function subscribeToPortal() {
  return () => {};
}

function getPortalSnapshot() {
  return document.body;
}

function getServerPortalSnapshot() {
  return null;
}

function CourseDiscoveryIllustration() {
  return (
    <svg className={styles.illustration} viewBox="0 0 520 250" aria-hidden="true" focusable="false">
      <rect width="520" height="250" rx="24" fill="#f7f8fd" />
      <rect x="20" y="16" width="480" height="39" rx="12" fill="#fff" stroke="#e2e8f0" />
      <circle cx="42" cy="35" r="6" fill="#0e56fa" />
      <path d="M59 35h102" stroke="#cbd5e1" strokeWidth="7" strokeLinecap="round" />
      <rect x="354" y="24" width="54" height="22" rx="11" fill="#eff6ff" />
      <rect x="416" y="24" width="68" height="22" rx="11" fill="#eff6ff" />
      <rect x="20" y="69" width="151" height="162" rx="15" fill="#fff" stroke="#e2e8f0" />
      <rect x="184" y="69" width="151" height="162" rx="15" fill="#fff" stroke="#e2e8f0" />
      <rect x="348" y="69" width="151" height="162" rx="15" fill="#fff" stroke="#e2e8f0" />
      <rect x="31" y="81" width="48" height="20" rx="10" fill="#eff6ff" />
      <rect x="195" y="81" width="48" height="20" rx="10" fill="#e6f7ee" />
      <rect x="359" y="81" width="48" height="20" rx="10" fill="#eff6ff" />
      <path d="M32 119h91M32 132h62M196 119h91M196 132h62M360 119h91M360 132h62" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <rect x="32" y="147" width="127" height="66" rx="9" fill="#e5f3e9" />
      <rect x="196" y="147" width="127" height="66" rx="9" fill="#e5f3e9" />
      <rect x="360" y="147" width="127" height="66" rx="9" fill="#e5f3e9" />
      <path d="M27 196 50 175l25 11 24-25 27 12 38-24M191 188l26-18 24 10 25-22 20 12 42-28M355 193l22-17 23 8 26-27 25 14 43-22" fill="none" stroke="#fff" strokeWidth="9" />
      <path d="M27 196 50 175l25 11 24-25 27 12 38-24M191 188l26-18 24 10 25-22 20 12 42-28M355 193l22-17 23 8 26-27 25 14 43-22" fill="none" stroke="#cbd5e1" strokeWidth="1.5" />
      <path d="M42 180c0-14 12-23 28-23h45c17 0 31 9 31 23s-14 23-31 23H70c-16 0-28-9-28-23ZM206 180c0-13 11-22 25-22 13 0 18-7 30-7 15 0 19 8 31 8 17 0 24 8 24 21s-10 21-24 21c-12 0-18 8-31 8-14 0-19-7-30-7-14 0-25-9-25-22ZM370 180c0-12 9-21 22-21 11 0 14-7 25-7 16 0 25 8 25 21s-9 21-25 21c-11 0-14 7-25 7-13 0-22-9-22-21Z" fill="none" stroke="#0e56fa" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="42" cy="180" r="3.5" fill="#00e575" />
      <circle cx="206" cy="180" r="3.5" fill="#00e575" />
      <circle cx="370" cy="180" r="3.5" fill="#00e575" />
      <path d="M32 222h53M196 222h53M360 222h53" stroke="#0e56fa" strokeWidth="7" strokeLinecap="round" />
      <path d="M94 222h31M258 222h31M422 222h31" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function BookmarkedCoursesIllustration() {
  return (
    <svg className={styles.illustration} viewBox="0 0 520 250" aria-hidden="true" focusable="false">
      <rect width="520" height="250" rx="24" fill="#eff6ff" />
      <rect x="48" y="22" width="424" height="206" rx="20" fill="#fff" stroke="#e2e8f0" />
      <rect x="67" y="39" width="76" height="23" rx="11.5" fill="#eff6ff" />
      <rect x="149" y="39" width="76" height="23" rx="11.5" fill="#e6f7ee" />
      <rect x="414" y="34" width="44" height="44" rx="15" fill="#eff6ff" />
      <path d="M436 44c-6-6-15-1-15 7 0 9 15 18 15 18s15-9 15-18c0-8-9-13-15-7Z" fill="#0e56fa" />
      <path d="M423 30l-3-10M436 28V16M449 30l3-10" stroke="#0e56fa" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M67 94h126" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
      <circle cx="73" cy="108" r="4" fill="#0e56fa" />
      <path d="M84 108h143" stroke="#cbd5e1" strokeWidth="5" strokeLinecap="round" />
      <rect x="67" y="119" width="386" height="69" rx="10" fill="#e5f3e9" />
      <path d="M117 153c0-14 18-23 38-23h178c21 0 37 9 37 23s-16 23-37 23H155c-20 0-38-9-38-23Z" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" />
      <path d="M117 153c0-14 18-23 38-23h178c21 0 37 9 37 23s-16 23-37 23H155c-20 0-38-9-38-23Z" fill="none" stroke="#0e56fa" strokeWidth="4" strokeLinecap="round" />
      <circle cx="117" cy="153" r="5" fill="#00e575" stroke="#fff" strokeWidth="2" />
      <path d="M68 207h43" stroke="#0e56fa" strokeWidth="7" strokeLinecap="round" />
      <path d="M119 207h37" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
      <path d="M173 207h24" stroke="#cbd5e1" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function ServiceIllustration({ slide }: { slide: number }) {
  if (slide === 1) return <CourseDiscoveryIllustration />;
  if (slide === 2) return <BookmarkedCoursesIllustration />;
  return (
    <svg
      className={styles.illustration}
      viewBox="0 0 520 250"
      aria-hidden="true"
      focusable="false"
    >
      <rect x="0" y="0" width="520" height="250" rx="24" fill="#eff6ff" />
      <path d="M0 76 110 33l87 25 99-43 120 38 104-26v223H0Z" fill="#e2f4e9" />
      <path
        d="M-12 177 92 120l85 19 88-58 84 21 94-49 91 31"
        fill="none"
        stroke="#fff"
        strokeWidth="22"
      />
      <path
        d="M-12 177 92 120l85 19 88-58 84 21 94-49 91 31"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      <path
        d="M49 250 126 184l45-45 57 26 44-84 72 21 40-53"
        fill="none"
        stroke="#fff"
        strokeWidth="16"
      />
      <path
        d="M49 250 126 184l45-45 57 26 44-84 72 21 40-53"
        fill="none"
        stroke="#cbd5e1"
        strokeWidth="2"
      />
      <ellipse cx="420" cy="174" rx="62" ry="35" fill="#bfdbfe" />
      <path
        d="M83 182C70 146 104 120 149 125c35 4 55 26 85 15 33-12 50-45 91-44 38 1 58 24 91 8 33-16 61 4 62 29 1 26-27 43-60 37-33-6-46 19-78 22-33 3-52-19-82-11-36 10-63 28-97 21-35-7-70 5-78-20Z"
        fill="none"
        stroke="#0e56fa"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx="83"
        cy="182"
        r="11"
        fill="#00e575"
        stroke="#fff"
        strokeWidth="5"
      />
      {slide === 0 && (
        <g>
          <rect x="183" y="150" width="168" height="67" rx="16" fill="#fff" />
          <circle cx="207" cy="174" r="8" fill="#00e575" />
          <path
            d="M223 174h104"
            stroke="#cbd5e1"
            strokeWidth="8"
            strokeLinecap="round"
          />
          <path
            d="M199 194h130"
            stroke="#e2e8f0"
            strokeWidth="7"
            strokeLinecap="round"
          />
        </g>
      )}
      {slide === 1 && (
        <g>
          <rect x="333" y="113" width="145" height="88" rx="16" fill="#fff" />
          <path
            d="M350 171c19-21 31-8 45-25 15-17 25 7 39-6 13-12 22-10 31-2"
            fill="none"
            stroke="#0e56fa"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M350 184h104"
            stroke="#cbd5e1"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <circle cx="457" cy="132" r="13" fill="#00e575" />
        </g>
      )}
      {slide === 2 && (
        <g>
          <rect x="337" y="112" width="141" height="90" rx="16" fill="#fff" />
          <path
            d="M354 176c18-17 29-4 43-19 12-12 20 5 34-7 12-10 23-9 33-1"
            fill="none"
            stroke="#0e56fa"
            strokeWidth="5"
            strokeLinecap="round"
          />
          <path
            d="M354 188h75"
            stroke="#cbd5e1"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M453 137c-7-7-17-2-17 6 0 10 17 20 17 20s17-10 17-20c0-8-10-13-17-6Z"
            fill="#0e56fa"
          />
        </g>
      )}
    </svg>
  );
}

export function HomeServiceIntro() {
  const dismissed = useSyncExternalStore(
    subscribeToDismissal,
    getDismissedSnapshot,
    getServerDismissedSnapshot,
  );
  const portalTarget = useSyncExternalStore(
    subscribeToPortal,
    getPortalSnapshot,
    getServerPortalSnapshot,
  );
  const [slide, setSlide] = useState(0);
  const dialogRef = useRef<HTMLElement>(null);
  const isOpen = !dismissed;

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialogRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  function closeIntro() {
    dismissedInMemory = true;
    try {
      sessionStorage.setItem(DISMISS_KEY, "true");
    } catch {
      // Keep this tab's intro dismissed for its remaining lifetime.
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }

  function changeSlide(nextSlide: number) {
    setSlide(Math.max(0, Math.min(slides.length - 1, nextSlide)));
  }

  if (!isOpen || !portalTarget) return null;

  return createPortal(
    <div className={styles.backdrop}>
      <section
        ref={dialogRef}
        className={styles.dialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-intro-title"
        aria-describedby="home-intro-description"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            closeIntro();
          } else if (event.key === "ArrowLeft") {
            event.preventDefault();
            changeSlide(slide - 1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            changeSlide(slide + 1);
          } else if (event.key === "Tab") {
            const buttons =
              dialogRef.current?.querySelectorAll<HTMLButtonElement>(
                "button:not(:disabled)",
              );
            if (!buttons?.length) return;
            const first = buttons[0];
            const last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) {
              event.preventDefault();
              last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
              event.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <button
          className={styles.closeButton}
          type="button"
          onClick={closeIntro}
          aria-label="서비스 소개 닫기"
        >
          닫기
        </button>

        <div className={styles.visual}>
          <ServiceIllustration slide={slide} />
          <button
            className={`${styles.arrowButton} ${styles.previousButton}`}
            type="button"
            onClick={() => changeSlide(slide - 1)}
            disabled={slide === 0}
            aria-label="이전 소개 보기"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            className={`${styles.arrowButton} ${styles.nextButton}`}
            type="button"
            onClick={() => changeSlide(slide + 1)}
            disabled={slide === slides.length - 1}
            aria-label="다음 소개 보기"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        </div>

        <div className={styles.copy} aria-live="polite">
          <p className={styles.counter}>
            {slide + 1} / {slides.length}
          </p>
          <h2 id="home-intro-title">{slides[slide].title}</h2>
          <p id="home-intro-description">{slides[slide].description}</p>
        </div>

        <div className={styles.pagination} aria-hidden="true">
          {slides.map((item, index) => (
            <span
              key={item.title}
              className={index === slide ? styles.activeDot : styles.dot}
            />
          ))}
        </div>
      </section>
    </div>,
    portalTarget,
  );
}
