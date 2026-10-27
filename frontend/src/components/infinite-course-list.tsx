"use client";

import homeStyles from "@/app/home.module.css";
import { ExploreCourseCard } from "@/components/explore-course-card";
import { useRouter } from "next/navigation";
import type { CourseListResponse } from "@/lib/courses";
import {
  courseDetailSearch,
  courseListHref,
  type CourseListQuery,
} from "@/lib/course-search";
import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function InfiniteCourseList({
  initialPage,
  query,
}: {
  initialPage: CourseListResponse;
  query: CourseListQuery;
}) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialPage.content);
  const [page, setPage] = useState(initialPage.page);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const pageRef = useRef(initialPage.page);
  const requestGeneration = useRef(0);
  const activeRequest = useRef<AbortController | null>(null);
  const synchronizedPage = useRef(initialPage);
  const refreshFailed = useRef(false);
  const eagerPreviewIds = useMemo(
    () => new Set(initialPage.content.slice(0, 3).map((course) => course.id)),
    [initialPage.content],
  );
  const [hasMore, setHasMore] = useState(initialPage.hasNext);

  useEffect(() => () => {
    activeRequest.current?.abort();
    requestGeneration.current += 1;
    loadingRef.current = false;
    setLoading(false);
  }, []);

  // A route refresh supplies a new first page, but Activity preserves this state.
  // Reload the pages already shown so returning from detail keeps scroll context.
  useEffect(() => {
    if (synchronizedPage.current === initialPage) return;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    const generation = ++requestGeneration.current;
    loadingRef.current = true;
    const lastVisiblePage = Math.max(initialPage.page, pageRef.current);
    async function synchronize() {
      try {
        const additionalPages = await Promise.all(
          Array.from({ length: lastVisiblePage - initialPage.page }, async (_, index) => {
            const href = courseListHref(query, initialPage.page + index + 1).replace(/^\//, "/api/courses");
            const response = await fetch(href, { cache: "no-store", signal: controller.signal });
            if (!response.ok) throw new Error("Course list refresh failed");
            return response.json() as Promise<CourseListResponse>;
          }),
        );
        if (controller.signal.aborted || generation !== requestGeneration.current) return;
        const pages = [initialPage, ...additionalPages];
        const latest = pages.at(-1)!;
        setCourses([...new Map(pages.flatMap((part) => part.content).map((course) => [course.id, course])).values()]);
        setPage(latest.page);
        pageRef.current = latest.page;
        setHasMore(latest.hasNext);
        setError(false);
        refreshFailed.current = false;
        synchronizedPage.current = initialPage;
      } catch {
        if (!controller.signal.aborted && generation === requestGeneration.current) {
          refreshFailed.current = true;
          setError(true);
        }
      } finally {
        if (generation === requestGeneration.current) {
          loadingRef.current = false;
          setLoading(false);
        }
      }
    }
    void synchronize();
    return () => { controller.abort(); };
  }, [initialPage, query]);

  const loadNextPage = useCallback(async () => {
    if (refreshFailed.current) {
      router.refresh();
      return;
    }
    if (!hasMore || loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    setError(false);
    const nextPage = page + 1;
    const generation = requestGeneration.current;
    const controller = new AbortController();
    activeRequest.current = controller;
    try {
      const href = courseListHref(query, nextPage).replace(/^\//, "/api/courses");
      const response = await fetch(href, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Course list request failed");
      const result: CourseListResponse = await response.json();
      if (controller.signal.aborted || generation !== requestGeneration.current) return;
      setCourses((current) => [...new Map([...current, ...result.content].map((course) => [course.id, course])).values()]);
      setPage(result.page);
      pageRef.current = result.page;
      setHasMore(result.hasNext);
    } catch {
      if (!controller.signal.aborted && generation === requestGeneration.current) setError(true);
    } finally {
      if (generation === requestGeneration.current) {
        loadingRef.current = false;
        setLoading(false);
      }
    }
  }, [hasMore, page, query, router]);

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
          <ExploreCourseCard
            key={course.id}
            course={course}
            detailSearch={detailSearch}
            eagerPreview={eagerPreviewIds.has(course.id)}
          />
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
