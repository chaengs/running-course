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
import { CourseElevation } from "@/components/course-elevation";
import { MapMarkerIcon } from "@/components/map-marker-icon";
import { courseTypeLabels, formatDistance } from "@/lib/course-format";
import { courseListHref, parseCourseListQuery } from "@/lib/course-search";
import { getCourse, recordCourseView } from "@/lib/courses";
import { getCurrentUser, sessionHeaders } from "@/lib/session";
import {
  CourseOwnerActions,
  ShareCourseButton,
} from "@/components/course-owner-actions";
import { CourseBookmark } from "@/components/course-bookmark";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const metadata: Metadata = { title: "코스 상세 | Running Course" };

async function CourseDetailContent({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807"))
    notFound();
  const [course, user, authHeaders] = await Promise.all([
    getCourse(id),
    getCurrentUser(),
    sessionHeaders(),
  ]);
  if (!course) notFound();
  after(() =>
    recordCourseView(course.id, course.ownerId === user?.id, authHeaders),
  );

  const listQuery = parseCourseListQuery(query) ?? { page: 0, size: 6 };
  const regionLabel = [
    course.region?.sido,
    course.region?.sigungu,
    course.region?.eupMyeonDong,
  ]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  const profile = course.elevationProfile;
  const difficultyLabel =
    profile?.difficulty.level === "LOW"
      ? "하"
      : profile?.difficulty.level === "MEDIUM"
        ? "중"
        : profile?.difficulty.level === "HIGH"
          ? "상"
          : null;

  return (
    <main id="main-content" className={layoutStyles.detailPage}>
      <Link className={uiStyles.backLink} href={courseListHref(listQuery)}>
        ← 코스 목록으로
      </Link>
      <header className={detailStyles.detailHeader}>
        <div className={detailStyles.headerTop}>
          <div className={detailStyles.titleBlock}>
            <div className={detailStyles.chips}>
              {regionLabel && (
                <span className={detailStyles.chip}>
                  <MapMarkerIcon />
                  {regionLabel}
                </span>
              )}
              <span className={detailStyles.chip}>
                {courseTypeLabels[course.courseType]}
              </span>
              <span
                className={`${detailStyles.chip} ${course.published ? detailStyles.chipPublic : detailStyles.chipPrivate}`}
              >
                {course.published ? "전체 공개" : "비공개"}
              </span>
            </div>
            <h1>{course.name}</h1>
          </div>
          <div className={detailStyles.headerActions}>
            {course.published && (
              <>
                <Suspense
                  fallback={
                    <span className={detailStyles.chip}>
                      찜 {course.bookmarkCount}
                    </span>
                  }
                >
                  <CourseBookmark
                    className={detailStyles.headerBookmark}
                    courseId={course.id}
                    loggedIn={Boolean(user)}
                    bookmarkCount={course.bookmarkCount}
                  />
                </Suspense>
                <ShareCourseButton className={detailStyles.headerShare} />
              </>
            )}
            {course.ownerId === user?.id && (
              <CourseOwnerActions id={course.id} />
            )}
          </div>
        </div>
      </header>

      <div className={detailStyles.detailGrid}>
        <div className={detailStyles.routeColumn}>
          <section
            className={detailStyles.routeCard}
            aria-labelledby="route-title"
          >
            <div className={detailStyles.routeHeading}>
              <h2 id="route-title">전체 경로</h2>
            </div>
            <CourseRouteMap route={course.routeGeojson} name={course.name} />
          </section>
          <section
            className={detailStyles.elevationCard}
            aria-label="코스 고도 프로필"
          >
            {profile ? (
              <CourseElevation
                route={course.routeGeojson}
                length={course.distanceMeters}
                initialProfile={profile}
                readOnly
                showMetrics={false}
              />
            ) : (
              <>
                <div className={detailStyles.elevationHeading}>
                  <h2>고도 프로필</h2>
                </div>
                <p className={detailStyles.elevationEmpty}>
                  저장된 고도 정보가 아직 없습니다.
                </p>
              </>
            )}
          </section>
        </div>

        <aside className={detailStyles.infoColumn}>
          <section
            className={detailStyles.infoCard}
            aria-labelledby="info-title"
          >
            <h2 id="info-title">코스 정보</h2>
            <dl className={detailStyles.distanceTile}>
              <dt>총 거리</dt>
              <dd>
                {formatDistance(course.distanceMeters)}
                <span>km</span>
              </dd>
            </dl>
            <dl className={detailStyles.metricGrid}>
              <div className={detailStyles.metricTile}>
                <dt>최고 고도</dt>
                <dd>
                  {profile ? Math.round(profile.maxElevationMeters) : "—"}
                  <span>{profile ? "m" : ""}</span>
                </dd>
              </div>
              <div className={detailStyles.metricTile}>
                <dt>누적 고도</dt>
                <dd>
                  {profile ? Math.round(profile.ascentMeters) : "—"}
                  <span>{profile ? "m" : ""}</span>
                </dd>
              </div>
              <div className={detailStyles.metricTile}>
                <dt>예상 난이도</dt>
                <dd
                  className={detailStyles.difficulty}
                  data-level={profile?.difficulty.level}
                >
                  {difficultyLabel ?? "—"}
                </dd>
                <span className={detailStyles.difficultyHelp}>고도 기준</span>
              </div>
              <div className={detailStyles.metricTile}>
                <dt>코스 유형</dt>
                <dd>{courseTypeLabels[course.courseType]}</dd>
              </div>
            </dl>
          </section>
          <section
            className={detailStyles.descriptionCard}
            aria-labelledby="description-title"
          >
            <h2 id="description-title">코스 소개</h2>
            <p>
              {course.description.trim() || "아직 등록된 코스 설명이 없어요."}
            </p>
          </section>
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
