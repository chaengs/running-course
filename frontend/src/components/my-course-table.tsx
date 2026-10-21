"use client";

import myStyles from "@/app/my/courses/page.module.css";
import { MyCourseRowActions } from "@/components/my-course-row-actions";
import type { MyCourse } from "@/lib/courses";
import { formatDistance } from "@/lib/course-format";
import uiStyles from "@/styles/ui.module.css";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

function count(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

export function MyCourseTable({
  courses,
  visibility,
  sort,
  counts,
  visibleCount,
}: {
  courses: MyCourse[];
  visibility: string;
  sort: string;
  counts: { all: number; published: number; private: number };
  visibleCount: number;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const selectAllRef = useRef<HTMLInputElement>(null);
  const selectedOnPage = courses.filter((course) =>
    selectedIds.includes(course.id),
  ).length;
  const allSelected = courses.length > 0 && selectedOnPage === courses.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selectedOnPage > 0 && !allSelected;
    }
  }, [allSelected, selectedOnPage]);

  function toggleCourse(id: number) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id],
    );
  }

  function toggleAll() {
    const pageIds = courses.map((course) => course.id);
    setSelectedIds((current) =>
      allSelected
        ? current.filter((id) => !pageIds.includes(id))
        : [...new Set([...current, ...pageIds])],
    );
  }

  async function publishSelected() {
    setPending(true);
    setError("");
    try {
      const response = await fetch("/api/courses/visibility", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseIds: selectedIds, published: true }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "선택한 코스를 공개하지 못했어요.");
      }
      setSelectedIds([]);
      setConfirming(false);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "선택한 코스를 공개하지 못했어요.",
      );
    } finally {
      setPending(false);
    }
  }

  function changeSort(nextSort: string) {
    router.push(
      `/my/courses?visibility=${encodeURIComponent(visibility)}&sort=${encodeURIComponent(nextSort)}&page=0`,
    );
  }

  return (
    <>
      <div className={myStyles.tableToolbar}>
        <nav className={myStyles.filterTabs} aria-label="공개 범위 필터">
          {[
            { value: "all", label: "전체 코스", count: counts.all },
            { value: "published", label: "공개 코스", count: counts.published },
            { value: "private", label: "비공개 코스", count: counts.private },
          ].map((filter) => (
            <Link
              key={filter.value}
              href={`/my/courses?visibility=${filter.value}&sort=${sort}&page=0`}
              aria-current={visibility === filter.value ? "page" : undefined}
              className={
                visibility === filter.value ? myStyles.activeFilter : undefined
              }
            >
              {filter.label}
              <span>{count(filter.count)}</span>
            </Link>
          ))}
        </nav>
        <div className={myStyles.tableActions}>
          <label className={myStyles.srOnly} htmlFor="course-sort">
            코스 정렬
          </label>
          <div className={myStyles.sortSelectWrap}>
            <select
              id="course-sort"
              value={sort}
              onChange={(event) => changeSort(event.target.value)}
            >
              <option value="recent">정렬: 최근 작성순</option>
              <option value="views">정렬: 조회 많은 순</option>
              <option value="bookmarks">정렬: 찜 많은 순</option>
            </select>
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path d="m7 10 5 5 5-5" />
            </svg>
          </div>
          <button
            className={myStyles.bulkPublishButton}
            type="button"
            onClick={() => setConfirming(true)}
            disabled={selectedIds.length === 0 || pending}
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>선택 일괄 공개 변경</span>
            {selectedIds.length > 0 && (
              <span className={myStyles.selectedCountBadge}>
                {selectedIds.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className={myStyles.selectionSummary}>
          <p>
            <strong>{selectedIds.length}</strong>개 코스가 선택되었습니다.
          </p>
          <button type="button" onClick={() => setSelectedIds([])}>
            선택 해제
          </button>
        </div>
      )}

      {courses.length > 0 && (
        <div className={myStyles.courseTableScroll}>
          <table className={myStyles.courseTable}>
            <thead>
              <tr>
                <th scope="col">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="현재 페이지 코스 모두 선택"
                  />
                </th>
                <th scope="col">코스 이름</th>
                <th scope="col">생성일</th>
                <th scope="col">코스 유형</th>
                <th scope="col">총 거리</th>
                <th scope="col">총 찜 수</th>
                <th scope="col">총 조회수</th>
                <th scope="col">공개 상태</th>
                <th scope="col">
                  <span className={uiStyles.srOnly}>관리</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <CourseRow
                  key={course.id}
                  course={course}
                  selected={selectedIds.includes(course.id)}
                  onToggle={() => toggleCourse(course.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && (
        <p className={myStyles.bulkError} role="alert">
          {error}
        </p>
      )}
      {confirming && (
        <div className={myStyles.bulkDialogBackdrop}>
          <section
            className={myStyles.bulkDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="bulk-publish-title"
          >
            <h2 id="bulk-publish-title">선택한 코스를 공개할까요?</h2>
            <p>{selectedIds.length}개 코스가 다른 러너에게 공개됩니다.</p>
            <div>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
              >
                취소
              </button>
              <button
                type="button"
                onClick={publishSelected}
                disabled={pending}
              >
                {pending ? "변경 중…" : "전체 공개"}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

function CourseRow({
  course,
  selected,
  onToggle,
}: {
  course: MyCourse;
  selected: boolean;
  onToggle: () => void;
}) {
  const name = course.name;
  const courseTypeLabel = course.courseType === "LOOP" ? "순환형" : "왕복형";
  const region = course.region
    ? [course.region.sido, course.region.sigungu, course.region.eupMyeonDong]
        .filter(Boolean)
        .join(" ")
    : "";
  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggle}
          aria-label={`${name} 선택`}
        />
      </td>
      <td className={myStyles.courseNameCell}>
        <div className={myStyles.courseNameText}>
          <Link prefetch={false} href={`/courses/${course.id}`}>
            {name}
          </Link>
          {region && (
            <span className={myStyles.courseRegion}>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                focusable="false"
              >
                <path
                  d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="10"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
              <span>{region}</span>
            </span>
          )}
        </div>
      </td>
      <td className={myStyles.dateCell}>{formatCreatedAt(course.createdAt)}</td>
      <td>
        <span className={myStyles.courseTypeBadge}>{courseTypeLabel}</span>
      </td>
      <td className={myStyles.distanceCell}>
        <strong>{formatDistance(course.distanceMeters)}</strong>
        <span>km</span>
      </td>
      <td>
        <span className={myStyles.metricCell}>
          {count(course.bookmarkCount)}
        </span>
      </td>
      <td>
        <span className={myStyles.metricCell}>{count(course.viewCount)}</span>
      </td>
      <td>
        <span
          className={`${myStyles.statusBadge} ${course.published ? myStyles.published : myStyles.private}`}
        >
          <span aria-hidden="true">{course.published ? "●" : "○"}</span>{" "}
          {course.published ? "공개" : "비공개"}
        </span>
      </td>
      <td>
        <MyCourseRowActions
          id={course.id}
          name={name}
          published={course.published}
        />
      </td>
    </tr>
  );
}
