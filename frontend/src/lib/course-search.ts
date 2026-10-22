export type CourseSearchFilters = {
  latitude?: number;
  longitude?: number;
  radiusMeters?: number;
  targetDistanceMeters?: number;
  minimumDistanceMeters?: number;
};

export type CourseListQuery = CourseSearchFilters & {
  page: number;
  size: number;
};

type RawSearchParams = { [key: string]: string | string[] | undefined };

export const COURSE_PAGE_SIZE = 6;
export const RADIUS_OPTIONS = [1000, 2000, 5000, 10000] as const;
export const TARGET_DISTANCE_OPTIONS = [3000, 5000, 10000] as const;

function singleValue(value: string | string[] | undefined) {
  return typeof value === "string" ? value : undefined;
}

function optionalInteger(value: string | undefined, min: number, max: number) {
  if (value === undefined || value === "") return undefined;
  if (!/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed >= min && parsed <= max ? parsed : null;
}

function optionalCoordinate(value: string | undefined, min: number, max: number) {
  if (value === undefined || value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= min && parsed <= max ? parsed : null;
}

export function parseCourseListQuery(query: RawSearchParams): CourseListQuery | null {
  const rawPage = singleValue(query.page) ?? "0";
  const page = optionalInteger(rawPage, 0, 2147483647);
  const size = COURSE_PAGE_SIZE;
  const latitude = optionalCoordinate(singleValue(query.latitude), -90, 90);
  const longitude = optionalCoordinate(singleValue(query.longitude), -180, 180);
  const radiusMeters = optionalInteger(singleValue(query.radiusMeters), 1, 50000);
  const targetDistanceMeters = optionalInteger(singleValue(query.targetDistanceMeters), 1, 100000);
  const minimumDistanceMeters = optionalInteger(singleValue(query.minimumDistanceMeters), 1, 100000);

  if (
    page === null || page === undefined ||
    latitude === null || longitude === null || radiusMeters === null || targetDistanceMeters === null || minimumDistanceMeters === null ||
    (targetDistanceMeters !== undefined && minimumDistanceMeters !== undefined) ||
    (latitude === undefined) !== (longitude === undefined) ||
    (radiusMeters !== undefined && latitude === undefined)
  ) return null;

  return { page, size, latitude, longitude, radiusMeters, targetDistanceMeters, minimumDistanceMeters };
}

export function courseListHref(query: CourseListQuery, page = query.page) {
  const params = new URLSearchParams();
  if (page > 0) params.set("page", String(page));
  if (query.latitude !== undefined && query.longitude !== undefined) {
    params.set("latitude", String(query.latitude));
    params.set("longitude", String(query.longitude));
    if (query.radiusMeters !== undefined) params.set("radiusMeters", String(query.radiusMeters));
  }
  if (query.targetDistanceMeters !== undefined) params.set("targetDistanceMeters", String(query.targetDistanceMeters));
  if (query.minimumDistanceMeters !== undefined) params.set("minimumDistanceMeters", String(query.minimumDistanceMeters));
  const search = params.toString();
  return search ? `/?${search}` : "/";
}

export function courseDetailSearch(query: CourseListQuery) {
  return courseListHref(query).slice(1);
}
