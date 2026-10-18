"use client";

import dynamic from "next/dynamic";
import type { CourseDetail } from "@/lib/courses";

const CourseMap = dynamic(() => import("./course-map"), {
  ssr: false,
  loading: () => <div className="route-map map-placeholder" role="status">지도를 준비하고 있어요…</div>,
});

export function CourseRouteMap({ course }: { course: CourseDetail }) {
  return <CourseMap route={course.routeGeojson} name={course.name} />;
}
