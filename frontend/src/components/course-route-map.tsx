"use client";
import routeStyles from "@/components/course-map.module.css";
import uiStyles from "@/styles/ui.module.css";
import dynamic from "next/dynamic";
import type { CourseDetail } from "@/lib/courses";
const CourseMap = dynamic(() => import("./course-map"), {
    ssr: false,
    loading: () => <div className={routeStyles.routeMap + " " + uiStyles.mapPlaceholder} role="status">지도를 준비하고 있어요…</div>,
});
export function CourseRouteMap({ route, name }: {
    route: CourseDetail["routeGeojson"];
    name: string;
}) {
    return <CourseMap route={route} name={name}/>;
}
