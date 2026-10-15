export type CourseType = "LOOP" | "OUT_AND_BACK";

export type CourseSummary = {
  id: number;
  name: string;
  distanceMeters: number;
  courseType: CourseType;
  startLocation: { latitude: number; longitude: number };
};

export type CourseListResponse = {
  content: CourseSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

// Server Components에서만 호출합니다. 브라우저는 Kotlin 서버에 직접 요청하지 않습니다.
export async function getCourses(page: number, size: number): Promise<CourseListResponse> {
  const baseUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
  const url = new URL("/api/courses", baseUrl);
  url.searchParams.set("page", String(page));
  url.searchParams.set("size", String(size));

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error(`Course list request failed (${response.status})`);
  return response.json();
}
