import cardStyles from "@/components/course-card.module.css";
import uiStyles from "@/styles/ui.module.css";
import Link from "next/link";
import { RoutePreview } from "./route-preview";
import type { CourseSummary } from "@/lib/courses";
import { courseTypeLabels, formatDistance } from "@/lib/course-format";
function formatDistanceToStart(distanceMeters: number) {
    return distanceMeters < 1000 ? `${Math.round(distanceMeters)}m` : `${(distanceMeters / 1000).toFixed(1)}km`;
}
function MapMarkerIcon() {
    return (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none">
            <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    );
}
export function CourseCard({ course, detailSearch = "" }: {
    course: CourseSummary;
    detailSearch?: string;
}) {
    const distance = formatDistance(course.distanceMeters);
    const regionLabel = [course.region?.sido, course.region?.sigungu, course.region?.eupMyeonDong]
        .filter((part): part is string => Boolean(part))
        .join(" · ");
    return (<li className={cardStyles.courseCard}>
      <article aria-labelledby={`course-${course.id}`}>
        <div className={uiStyles.cardTop}>
          <span className={uiStyles.typeBadge}>{courseTypeLabels[course.courseType]}</span>
        </div>
        <h3 id={`course-${course.id}`}><Link className={cardStyles.courseDetailLink} prefetch={false} href={`/courses/${course.id}${detailSearch}`}>{course.name}<span className={uiStyles.srOnly}> 상세 보기</span></Link></h3>
        {regionLabel && <p className={cardStyles.courseRegion}><MapMarkerIcon /><span>{regionLabel}</span></p>}
        <RoutePreview courseId={course.id} name={course.name}/><div className={cardStyles.cardMetrics}><div><span>총 거리</span><strong>{distance} <small>km</small></strong></div><div><span>코스 유형</span><strong>{courseTypeLabels[course.courseType]}</strong></div><div><span>출발 · 도착</span><strong>동일 지점</strong></div></div>
        {course.distanceToStartMeters !== null && <p className={cardStyles.distanceToStart}><MapMarkerIcon /><span>출발점까지 {formatDistanceToStart(course.distanceToStartMeters)}</span></p>}
        <div className={cardStyles.cardFooter}>
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
          <span>코스 자세히 보기</span><span className={cardStyles.cardArrow} aria-hidden="true">↗</span>
        </div>
      </article>
    </li>);
}
