import "server-only";
import { sessionHeaders } from "@/lib/session";
import type { CourseSearchFilters } from "@/lib/course-search";

export type CourseType = "LOOP" | "OUT_AND_BACK";

export type CourseSummary = {
  id: number;
  name: string;
  distanceMeters: number;
  courseType: CourseType;
  startLocation: { latitude: number; longitude: number };
  distanceToStartMeters: number | null;
};

export type CourseListResponse = {
  content: CourseSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// Server Components에서만 호출합니다. 브라우저는 Kotlin 서버에 직접 요청하지 않습니다.
export async function getCourses(page: number, size: number, filters: CourseSearchFilters = {}): Promise<CourseListResponse> {
  const baseUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const url = new URL("/api/courses", baseUrl);
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

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Course list request failed (${response.status})`);
  return response.json();
}

export type CourseDetail = Omit<CourseSummary, "distanceToStartMeters"> & {
  description: string;
  routeGeojson: { type: "LineString"; coordinates: [number, number][] };
  ownerId: number | null;
  published: boolean;
};

export async function getCourse(id: string): Promise<CourseDetail | null> {
  const baseUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const headers = await sessionHeaders();
  if (headers.Authorization) {
    const owned = await fetch(new URL(`/api/my/courses/${id}`, baseUrl), { headers, cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (owned.ok) return owned.json();
    if (owned.status !== 404 && owned.status !== 401) throw new Error("코스를 조회하지 못했어요.");
  }
  const response = await fetch(new URL(`/api/courses/${id}`, baseUrl), {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Course detail request failed (${response.status})`);
  return response.json();
}

export type MyCourse = { id: number; name: string; distanceMeters: number; published: boolean };
export async function getMyCourses(): Promise<MyCourse[]> {
  const response = await fetch(new URL("/api/my/courses", process.env.BACKEND_URL ?? "http://localhost:8080"), {
    headers: await sessionHeaders(), cache: "no-store", signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("내 코스를 불러오지 못했어요.");
  return response.json();
}
