import Link from "next/link";
import { RoutePreview } from "./route-preview";
import type { CourseSummary } from "@/lib/courses";
import { courseDisplayName, courseTypeLabels, formatDistance } from "@/lib/course-format";

function formatDistanceToStart(distanceMeters: number) {
  return distanceMeters < 1000 ? `${Math.round(distanceMeters)}m` : `${(distanceMeters / 1000).toFixed(1)}km`;
}

export function CourseCard({ course, detailSearch = "" }: { course: CourseSummary; detailSearch?: string }) {
  const isSample = course.name.startsWith("[개발용]");
  const name = courseDisplayName(course.name);
  const distance = formatDistance(course.distanceMeters);

  return (
    <li className="course-card">
      <article aria-labelledby={`course-${course.id}`}>
        <div className="card-top">
          <span className="type-badge">{courseTypeLabels[course.courseType]}</span>
          {isSample && <span className="sample-badge">개발용 샘플</span>}
        </div>
        <h3 id={`course-${course.id}`}><Link className="course-detail-link" prefetch={false} href={`/courses/${course.id}${detailSearch}`}>{name}<span className="sr-only"> 상세 보기</span></Link></h3>
        <RoutePreview courseId={course.id} name={courseDisplayName(course.name)} /><div className="card-metrics"><div><span>총 거리</span><strong>{distance} <small>km</small></strong></div><div><span>코스 유형</span><strong>{courseTypeLabels[course.courseType]}</strong></div><div><span>출발 · 도착</span><strong>동일 지점</strong></div></div>
        {course.distanceToStartMeters !== null && <p className="distance-to-start"><span aria-hidden="true">⌖</span> 출발점까지 {formatDistanceToStart(course.distanceToStartMeters)}</p>}
        <div className="card-footer">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
          <span>코스 자세히 보기</span><span className="card-arrow" aria-hidden="true">↗</span>
        </div>
      </article>
    </li>
  );
}
