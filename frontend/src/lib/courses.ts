import type { CourseElevationProfile } from "@/components/course-elevation";
import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { sessionHeaders } from "@/lib/session";
import type { CourseSearchFilters } from "@/lib/course-search";

export type CourseType = "LOOP" | "OUT_AND_BACK";
export type CourseRegion = {
  sido: string | null;
  sigungu: string | null;
  eupMyeonDong: string | null;
};

export type CourseSummary = {
  id: number;
  name: string;
  distanceMeters: number;
  courseType: CourseType;
  region: CourseRegion | null;
  elevationDifficulty: "LOW" | "MEDIUM" | "HIGH" | null;
  isBookmarked: boolean;
  startLocation: { latitude: number; longitude: number };
  distanceToStartMeters: number | null;
};

export type CourseListResponse = {
  content: CourseSummary[];
  page: number;
  size: number;
  hasNext: boolean;
};

// Server Components에서만 호출합니다. 브라우저는 Kotlin 서버에 직접 요청하지 않습니다.
export async function getCourses(page: number, size: number, filters: CourseSearchFilters = {}): Promise<CourseListResponse> {
  const baseUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const url = new URL("/api/courses/feed", baseUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));
  if (filters.latitude !== undefined && filters.longitude !== undefined) {
    url.searchParams.set("latitude", String(filters.latitude));
    url.searchParams.set("longitude", String(filters.longitude));
    if (filters.radiusMeters !== undefined) url.searchParams.set("radiusMeters", String(filters.radiusMeters));
  }
  if (filters.targetDistanceMeters !== undefined) {
    url.searchParams.set("targetDistanceMeters", String(filters.targetDistanceMeters));
  }
  if (filters.minimumDistanceMeters !== undefined) {
    url.searchParams.set("minimumDistanceMeters", String(filters.minimumDistanceMeters));
  }

  const response = await fetch(url, {
    headers: await sessionHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Course list request failed (${response.status})`);
  return response.json();
}

export type CourseDetail = Omit<CourseSummary, "distanceToStartMeters"> & {
  description: string;
  routeGeojson: { type: "LineString"; coordinates: [number, number][] };
  routeWaypoints: { type: "LineString"; coordinates: [number, number][] } | null;
  ownerId: number | null;
  published: boolean;
  elevationProfile: CourseElevationProfile | null;
  bookmarkCount: number;
  isBookmarked: boolean;
};

export const getCourse = cache(async (id: string): Promise<CourseDetail | null> => {
  const baseUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const headers = await sessionHeaders();
  // This endpoint handles public courses, private owner access, and existing bookmarks.
  const response = await fetch(new URL(`/api/courses/${id}`, baseUrl), {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Course detail request failed (${response.status})`);
  return response.json();
});

export type MyCourse = { id: number; name: string; distanceMeters: number; courseType: CourseType; createdAt: string; region: CourseRegion | null; published: boolean; bookmarkCount: number; viewCount: number };
export type MyCourseStats = { totalCourses: number; totalDistanceMeters: number; totalViews: number; totalBookmarks: number; publishedCourses: number; privateCourses: number };
export type MyCoursesResponse = { content: MyCourse[]; stats: MyCourseStats; page: number; totalPages: number };
export type BookmarkedCourse = Pick<CourseSummary, "id" | "name" | "distanceMeters" | "courseType" | "region" | "elevationDifficulty" | "isBookmarked"> & { published: boolean };
export type BookmarkPage = { content: BookmarkedCourse[]; page: number; hasNext: boolean };
export async function getBookmarkedCourses(page: number): Promise<BookmarkPage> {
  const headers = await sessionHeaders();
  if (!headers.Authorization) redirect("/login");
  const url = new URL("/api/my/bookmarks", process.env.BACKEND_URL ?? "http://localhost:8080");
  url.searchParams.set("page", String(page));
  const response = await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
  if (response.status === 401) redirect("/login");
  if (!response.ok) throw new Error("찜한 코스를 불러오지 못했어요.");
  return response.json();
}

export async function getMyCourses(page = 0, visibility = "all", sort = "recent"): Promise<MyCoursesResponse> {
  const headers = await sessionHeaders();
  if (!headers.Authorization) redirect("/login");
  const url = new URL("/api/my/courses", process.env.BACKEND_URL ?? "http://localhost:8080");
  url.searchParams.set("page", String(page));
  url.searchParams.set("visibility", visibility);
  url.searchParams.set("sort", sort);
  const response = await fetch(url, {
    headers, cache: "no-store", signal: AbortSignal.timeout(5000),
  });
  if (response.status === 401) redirect("/login");
  if (!response.ok) throw new Error("내 코스를 불러오지 못했어요.");
  return response.json();
}

export async function recordCourseView(id: number, isOwner: boolean, headers: Record<string, string>) {
  const path = isOwner ? `/api/my/courses/${id}/view` : `/api/courses/${id}/view`;
  try {
    await fetch(new URL(path, process.env.BACKEND_URL ?? "http://localhost:8080"), {
      method: "POST", headers: isOwner ? headers : undefined, cache: "no-store", signal: AbortSignal.timeout(5000),
    });
  } catch {
    // View tracking is best-effort and must not make the course page unavailable.
  }
}
