import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CourseDetailSkeleton } from "@/components/course-detail-skeleton";
import { CourseRouteMap } from "@/components/course-route-map";
import { courseDisplayName, courseTypeLabels, formatDistance } from "@/lib/course-format";
import { courseListHref, parseCourseListQuery } from "@/lib/course-search";
import { getCourse } from "@/lib/courses";
import { getCurrentUser } from "@/lib/session";
import { CourseOwnerActions, ShareCourseButton } from "@/components/course-owner-actions";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const metadata: Metadata = { title: "코스 상세 | Running Course" };

async function CourseDetailContent({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (!/^[1-9]\d{0,18}$/.test(id) || BigInt(id) > BigInt("9223372036854775807")) notFound();
  const [course, user] = await Promise.all([getCourse(id), getCurrentUser()]);
  if (!course) notFound();
  const listQuery = parseCourseListQuery(query) ?? { page: 0, size: 6 };
  const name = courseDisplayName(course.name);
  const isSample = course.name.startsWith("[개발용]");

  return (
    <main id="main-content" className="detail-page">
      <Link className="back-link" href={courseListHref(listQuery)}>← 코스 목록으로</Link>
      <header className="detail-heading">
        <p className="eyebrow">YOUR NEXT RUN</p>
        <div className="card-top"><span className="type-badge">{courseTypeLabels[course.courseType]}</span>{isSample && <span className="sample-badge">개발용 샘플</span>}</div>
        <h1>{name}</h1>
        <p className="detail-intro">출발점으로 돌아오는 길, 나만의 페이스로 달려보세요.</p>
      </header>
      {course.ownerId === user?.id && <CourseOwnerActions id={course.id} published={course.published} />}
      {course.published && <ShareCourseButton />}
      {isSample && <p className="sample-notice"><span aria-hidden="true">ⓘ</span> 실제 도로를 따르지 않는 개발용 가상 경로입니다. 실제 러닝에 사용하지 마세요.</p>}
      <div className="detail-grid">
        <section className="route-section" aria-labelledby="route-title">
          <div className="route-heading"><h2 id="route-title">전체 경로</h2><span>출발점과 도착점이 같아요</span></div>
          <CourseRouteMap route={course.routeGeojson} name={course.name} />
          <p className="map-caption">지도를 드래그하거나 확대해 경로를 살펴보세요.</p>
        </section>
        <aside className="course-info" aria-labelledby="info-title">
          <p className="eyebrow">COURSE OVERVIEW</p><h2 id="info-title">코스 정보</h2>
          <dl className="detail-stats">
            <div><dt>총거리</dt><dd className="detail-distance">{formatDistance(course.distanceMeters)}<span>km</span></dd></div>
            <div><dt>코스 유형</dt><dd>{courseTypeLabels[course.courseType]}</dd></div>
            <div><dt>출발 · 도착</dt><dd>동일한 지점</dd></div>
          </dl>
          <div className="course-description"><h3>코스 소개</h3><p>{course.description.trim() || "아직 등록된 코스 설명이 없어요."}</p></div>
        </aside>
      </div>
    </main>
  );
}

export default function CourseDetailPage(props: Props) {
  return <Suspense fallback={<CourseDetailSkeleton />}><CourseDetailContent {...props} /></Suspense>;
}
