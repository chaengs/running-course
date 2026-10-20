import cardStyles from "@/components/explore-course-card.module.css";
import uiStyles from "@/styles/ui.module.css";
import Link from "next/link";
import { RoutePreview } from "@/components/route-preview";
import { MapMarkerIcon } from "@/components/map-marker-icon";
import { CourseCardBookmark } from "@/components/course-card-bookmark";
import type { CourseSummary } from "@/lib/courses";
import { courseTypeLabels, formatDistance } from "@/lib/course-format";

const difficultyLabels = {
  LOW: "초급",
  MEDIUM: "중급",
  HIGH: "상급",
} as const;

export function ExploreCourseCard({
  course,
  detailSearch = "",
  refreshOnBookmarkChange = false,
}: {
  course: Pick<CourseSummary, "id" | "name" | "distanceMeters" | "courseType" | "region" | "elevationDifficulty" | "isBookmarked">;
  detailSearch?: string;
  refreshOnBookmarkChange?: boolean;
}) {
  const region = [course.region?.sido, course.region?.sigungu, course.region?.eupMyeonDong]
    .filter((part): part is string => Boolean(part))
    .join(" · ");

  return (
    <li className={cardStyles.courseCard}>
      <article aria-labelledby={`explore-course-${course.id}`}>
        <div className={cardStyles.badges}>
          <span className={cardStyles.courseType}>{courseTypeLabels[course.courseType]}</span>
          {course.elevationDifficulty && (
            <span className={cardStyles.difficulty} data-level={course.elevationDifficulty}>
              {difficultyLabels[course.elevationDifficulty]}
            </span>
          )}
          <div className={cardStyles.bookmarkPosition}>
            <CourseCardBookmark courseId={course.id} initialBookmarked={course.isBookmarked} refreshOnChange={refreshOnBookmarkChange} />
          </div>
        </div>
        <h3 id={`explore-course-${course.id}`} className={cardStyles.courseName}>
          <Link href={`/courses/${course.id}${detailSearch}`} prefetch={false}>
            {course.name}
            <span className={uiStyles.srOnly}> 상세 보기</span>
          </Link>
        </h3>
        <p className={cardStyles.courseRegion}>
          <MapMarkerIcon />
          <span>{region || "행정 주소 정보 없음"}</span>
        </p>
        <RoutePreview
          className={cardStyles.routePreview}
          courseId={course.id}
          name={course.name}
        />
        <p className={cardStyles.distance}>
          <strong>{formatDistance(course.distanceMeters)}</strong>
          <span>km</span>
        </p>
      </article>
    </li>
  );
}
