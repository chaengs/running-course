import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import detailStyles from "@/components/course-detail.module.css";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";
import { Suspense } from "react";
import { CourseDetailSkeleton } from "@/components/course-detail-skeleton";
import { CourseRouteMap } from "@/components/course-route-map";
import {
  courseDisplayName,
  courseTypeLabels,
  formatDistance,
} from "@/lib/course-format";
import { courseListHref, parseCourseListQuery } from "@/lib/course-search";
import { getCourse, recordCourseView } from "@/lib/courses";
import { getCurrentUser, sessionHeaders } from "@/lib/session";
import {
  CourseOwnerActions,
  ShareCourseButton,
} from "@/components/course-owner-actions";
import { CourseBookmark } from "@/components/course-bookmark";
type Props = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    [key: string]: string | string[] | undefined;
  }>;
};
export const metadata: Metadata = { title: "코스 상세 | Running Course" };
async function CourseDetailContent({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807"))
    notFound();
  const [course, user, authHeaders] = await Promise.all([getCourse(id), getCurrentUser(), sessionHeaders()]);
  if (!course) notFound();
  after(() => recordCourseView(course.id, course.ownerId === user?.id, authHeaders));
  const listQuery = parseCourseListQuery(query) ?? { page: 0, size: 6 };
  const name = courseDisplayName(course.name);
  const isSample = course.name.startsWith("[개발용]");
  const regionLabel = [course.region?.sido, course.region?.sigungu, course.region?.eupMyeonDong]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  return (
    <main id="main-content" className={layoutStyles.detailPage}>
      <Link className={uiStyles.backLink} href={courseListHref(listQuery)}>
        ← 코스 목록으로
      </Link>
      <header className={layoutStyles.detailHeading}>
        <p className={uiStyles.eyebrow}>YOUR NEXT RUN</p>
        <div className={uiStyles.cardTop}>
          <span className={uiStyles.typeBadge}>
            {courseTypeLabels[course.courseType]}
          </span>
          {isSample && (
            <span className={uiStyles.sampleBadge}>개발용 샘플</span>
          )}
        </div>
        <h1>{name}</h1>
        <p className={layoutStyles.detailIntro}>
          출발점으로 돌아오는 길, 나만의 페이스로 달려보세요.
        </p>
      </header>
      {isSample && (
        <p className={uiStyles.sampleNotice}>
          <span aria-hidden="true">ⓘ</span> 실제 도로를 따르지 않는 개발용 가상
          경로입니다. 실제 러닝에 사용하지 마세요.
        </p>
      )}
      <div className={detailStyles.detailGrid}>
        <section
          className={detailStyles.routeSection}
          aria-labelledby="route-title"
        >
          <div className={detailStyles.routeHeading}>
            <h2 id="route-title">전체 경로</h2>
          </div>
          <CourseRouteMap route={course.routeGeojson} name={course.name} />
          <p className={uiStyles.mapCaption}>
            지도를 드래그하거나 마우스 휠·확대/축소 버튼으로 경로를 살펴보세요.
          </p>
          <section className={detailStyles.routeGuide}>
            <p className={uiStyles.eyebrow}>RUN YOUR OWN PACE</p>
            <h2>코스 러닝 가이드</h2>
            <div className={detailStyles.guideGrid}>
              <div>
                <span>01 · START</span>
                <h3>출발 지점 확인</h3>
                <p>지도에서 출발점을 확인하고, 주변 보행 환경을 살펴보세요.</p>
              </div>
              <div>
                <span>02 · ROUTE</span>
                <h3>나만의 페이스로</h3>
                <p>
                  전체 {formatDistance(course.distanceMeters)}km의 경로를
                  확인하고 러닝을 준비하세요.
                </p>
              </div>
            </div>
          </section>
        </section>
        <aside className={uiStyles.courseInfo} aria-labelledby="info-title">
          <p className={uiStyles.eyebrow}>COURSE TELEMETRY</p>
          <h2 id="info-title">코스 상세 데이터</h2>
          <dl className={detailStyles.detailStats}>
            <div>
              <dt>총거리</dt>
              <dd className={detailStyles.detailDistance}>
                {formatDistance(course.distanceMeters)}
                <span>km</span>
              </dd>
            </div>
            <div>
              <dt>코스 유형</dt>
              <dd>{courseTypeLabels[course.courseType]}</dd>
            </div>
            <div>
              <dt>출발 지역</dt>
              <dd>{regionLabel || "지역 정보 없음"}</dd>
            </div>
          </dl>
          {course.ownerId === user?.id && (
            <CourseOwnerActions id={course.id} published={course.published} />
          )}
          {course.published && <ShareCourseButton />}
          {course.published && (
            <Suspense fallback={<p role="status">북마크 확인 중…</p>}>
              <CourseBookmark courseId={course.id} loggedIn={Boolean(user)} />
            </Suspense>
          )}
          <div className={detailStyles.courseDescription}>
            <h3>코스 소개</h3>
            <p>
              {course.description.trim() || "아직 등록된 코스 설명이 없어요."}
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
export default function CourseDetailPage(props: Props) {
  return (
    <Suspense fallback={<CourseDetailSkeleton />}>
      <CourseDetailContent {...props} />
    </Suspense>
  );
}
