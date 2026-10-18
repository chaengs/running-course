import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CourseCard } from "@/components/course-card";
import { CourseListSkeleton } from "@/components/course-list-skeleton";
import { CourseSearchForm } from "@/components/course-search-form";
import {
  courseDetailSearch,
  courseListHref,
  parseCourseListQuery,
  type CourseSearchFilters,
} from "@/lib/course-search";
import { getCourses } from "@/lib/courses";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

function FilterInputs({ filters }: { filters: CourseSearchFilters }) {
  return <>
    {filters.latitude !== undefined && <input type="hidden" name="latitude" value={filters.latitude} />}
    {filters.longitude !== undefined && <input type="hidden" name="longitude" value={filters.longitude} />}
    {filters.radiusMeters !== undefined && <input type="hidden" name="radiusMeters" value={filters.radiusMeters} />}
    {filters.targetDistanceMeters !== undefined && <input type="hidden" name="targetDistanceMeters" value={filters.targetDistanceMeters} />}
  </>;
}

async function CourseList({ searchParams }: { searchParams: SearchParams }) {
  const rawQuery = await searchParams;
  const query = parseCourseListQuery(rawQuery);
  if (!query) redirect("/");

  const { page, size, latitude, longitude, radiusMeters, targetDistanceMeters } = query;
  const filters = { latitude, longitude, radiusMeters, targetDistanceMeters };
  const courses = await getCourses(page, size, filters);
  const hasSamples = courses.content.some((course) => course.name.startsWith("[개발용]"));
  const hasLocation = latitude !== undefined;
  const hasFilters = hasLocation || targetDistanceMeters !== undefined;
  const filterDescription = [
    hasLocation ? `현재 위치에서 ${(radiusMeters ?? 2000) / 1000}km 이내` : undefined,
    targetDistanceMeters !== undefined ? `${targetDistanceMeters / 1000}km 코스(±10%)` : undefined,
  ].filter(Boolean).join(" · ");
  const detailSearch = courseDetailSearch(query);

  return (
    <>
      <CourseSearchForm key={`${latitude}-${longitude}-${radiusMeters}-${targetDistanceMeters}`} filters={filters} size={size} />
      <section className="list-section" aria-labelledby="courses-title">
        <div className="list-toolbar">
          <div><p className="eyebrow">FIND YOUR NEXT RUN</p><h2 id="courses-title">러닝 코스 <span>{courses.totalElements}</span></h2></div>
          <form action="/" className="page-size-form">
            <FilterInputs filters={filters} />
            <label htmlFor="page-size">페이지당</label>
            <select id="page-size" name="size" defaultValue={size}>
              {[3, 6, 12].map((value) => <option key={value} value={value}>{value}개</option>)}
            </select>
            <button type="submit">적용</button>
          </form>
        </div>
        <p className="list-description">{hasFilters ? `${filterDescription} 조건의 코스예요.` : "공개된 코스를 등록 순서대로 소개합니다."}</p>
        {hasSamples && <p className="sample-notice"><span aria-hidden="true">ⓘ</span> 개발용 샘플은 실제 도로를 따르지 않는 가상 경로입니다. 실제 러닝에 사용하지 마세요.</p>}
        {courses.content.length > 0 ? (
          <>
            <ul className="course-grid">{courses.content.map((course) => <CourseCard key={course.id} course={course} detailSearch={detailSearch} />)}</ul>
            <nav className="pagination" aria-label="코스 목록 페이지">
              {page > 0 ? <Link prefetch={false} href={courseListHref(query, page - 1)} aria-label="이전 페이지">← 이전</Link> : <span aria-disabled="true">← 이전</span>}
              <p><strong>{page + 1}</strong> / {courses.totalPages} <span className="sr-only">페이지</span></p>
              {page + 1 < courses.totalPages ? <Link prefetch={false} href={courseListHref(query, page + 1)} aria-label="다음 페이지">다음 →</Link> : <span aria-disabled="true">다음 →</span>}
            </nav>
          </>
        ) : (
          <div className="empty-state">
            <span className="state-symbol" aria-hidden="true">○</span>
            <h3>{courses.totalElements > 0 ? "이 페이지에는 코스가 없어요" : hasFilters ? "조건에 맞는 코스가 없어요" : "아직 등록된 코스가 없어요"}</h3>
            <p>{courses.totalElements > 0 ? "첫 페이지에서 달릴 코스를 찾아보세요." : hasFilters ? "검색 반경을 넓히거나 목표 거리를 바꿔보세요." : "새로운 코스가 공개되면 이곳에서 확인할 수 있어요."}</p>
            {page > 0 ? <Link className="button-primary" href={courseListHref(query, 0)}>첫 페이지로</Link> : hasFilters && <Link className="button-primary" href={size === 6 ? "/" : `/?size=${size}`}>전체 코스 보기</Link>}
          </div>
        )}
      </section>
    </>
  );
}

export default function Home({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main id="main-content">
      <header className="hero">
        <p className="eyebrow">A NEW ROUTE. YOUR OWN PACE.</p>
        <h1>다음 달리기는,<br /><em>새로운 코스에서.</em></h1>
        <p className="hero-description">가볍게 달리는 3km부터 도전하는 10km까지.<br />출발점으로 돌아오는 러닝 코스를 만나보세요.</p>
        <div className="hero-note"><span className="note-line" />길을 고르는 시간은 줄이고, 달리는 시간을 늘려요.</div>
      </header>
      <Suspense fallback={<CourseListSkeleton />}>
        <CourseList searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
