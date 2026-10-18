"use client";

import dynamic from "next/dynamic";
import type { CourseDetail } from "@/lib/courses";

const CourseMap = dynamic(() => import("./course-map"), {
  ssr: false,
  loading: () => <div className="route-map map-placeholder" role="status">지도를 준비하고 있어요…</div>,
});

export function CourseRouteMap({ route, name }: { route: CourseDetail["routeGeojson"]; name: string }) {
  return <CourseMap route={route} name={name} />;
}
