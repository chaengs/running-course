import Link from "next/link";
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
        <p className="course-distance"><strong>{distance}</strong><span>km</span></p>
        {course.distanceToStartMeters !== null && <p className="distance-to-start"><span aria-hidden="true">⌖</span> 출발점까지 {formatDistanceToStart(course.distanceToStartMeters)}</p>}
        <div className="card-footer">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
          <span>출발점으로 돌아오는 코스</span><span className="card-arrow" aria-hidden="true">↗</span>
        </div>
      </article>
    </li>
  );
}
