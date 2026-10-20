"use client";

import homeStyles from "@/app/home.module.css";
import { ExploreCourseCard } from "@/components/explore-course-card";
import type { CourseListResponse } from "@/lib/courses";
import {
  courseDetailSearch,
  courseListHref,
  type CourseListQuery,
} from "@/lib/course-search";
import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import { useCallback, useEffect, useRef, useState } from "react";

export function InfiniteCourseList({
  initialPage,
  query,
}: {
  initialPage: CourseListResponse;
  query: CourseListQuery;
}) {
  const [courses, setCourses] = useState(initialPage.content);
  const [page, setPage] = useState(initialPage.page);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const hasMore = page + 1 < initialPage.totalPages;

  const loadNextPage = useCallback(async () => {
    if (!hasMore || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);
    const nextPage = page + 1;
    try {
      const href = courseListHref(query, nextPage).replace(/^\//, "/api/courses");
      const response = await fetch(href, { cache: "no-store" });
      if (!response.ok) throw new Error("Course list request failed");
      const result: CourseListResponse = await response.json();
      setCourses((current) => [...current, ...result.content]);
      setPage(result.page);
    } catch {
      setError(true);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [hasMore, page, query]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || error) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadNextPage();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [error, hasMore, loadNextPage]);

  const detailSearch = courseDetailSearch(query);

  return (
    <>
      <ul className={layoutStyles.courseGrid}>
        {courses.map((course) => (
          <ExploreCourseCard key={course.id} course={course} detailSearch={detailSearch} />
        ))}
      </ul>
      {(hasMore || loading || error) && (
        <div className={homeStyles.infiniteControls}>
          <button
            type="button"
            className={uiStyles.buttonPrimary}
            onClick={() => void loadNextPage()}
            disabled={loading}
          >
            {loading ? "코스를 불러오는 중…" : error ? "다시 시도" : "더 많은 코스 보기"}
          </button>
          <p role="status" aria-live="polite">
            {error ? "코스를 불러오지 못했어요. 다시 시도해 주세요." : `${courses.length}개의 코스를 보고 있어요.`}
          </p>
          <div ref={sentinelRef} aria-hidden="true" />
        </div>
      )}
    </>
  );
}
