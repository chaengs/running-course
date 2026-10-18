import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CourseCard } from "@/components/course-card";
import { CourseListSkeleton } from "@/components/course-list-skeleton";
import { getCourses } from "@/lib/courses";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;
const PAGE_SIZES = [3, 6, 12];

function pageHref(page: number, size: number) {
  return `/?page=${page}&size=${size}`;
}

async function CourseList({ searchParams }: { searchParams: SearchParams }) {
  const query = await searchParams;
  const rawPage = query.page ?? "0";
  const rawSize = query.size ?? "6";
  if (typeof rawPage !== "string" || !/^\d+$/.test(rawPage) ||
      Number(rawPage) > 2147483647 || typeof rawSize !== "string" || !PAGE_SIZES.includes(Number(rawSize))) {
    redirect("/");
  }
  const page = Number(rawPage);
  const size = Number(rawSize);
  const courses = await getCourses(page, size);
  const hasSamples = courses.content.some((course) => course.name.startsWith("[개발용]"));

  return (
    <section className="list-section" aria-labelledby="courses-title">
      <div className="list-toolbar">
        <div><p className="eyebrow">FIND YOUR NEXT RUN</p><h2 id="courses-title">러닝 코스 <span>{courses.totalElements}</span></h2></div>
        <form action="/" className="page-size-form">
          <label htmlFor="page-size">페이지당</label>
          <select id="page-size" name="size" defaultValue={size}>
            {PAGE_SIZES.map((value) => <option key={value} value={value}>{value}개</option>)}
          </select>
          <button type="submit">적용</button>
        </form>
      </div>
      <p className="list-description">공개된 코스를 등록 순서대로 소개합니다.</p>
      {hasSamples && <p className="sample-notice"><span aria-hidden="true">ⓘ</span> 개발용 샘플은 실제 도로를 따르지 않는 가상 경로입니다. 실제 러닝에 사용하지 마세요.</p>}
      {courses.content.length > 0 ? (
        <>
          <ul className="course-grid">{courses.content.map((course) => <CourseCard key={course.id} course={course} page={page} size={size} />)}</ul>
          <nav className="pagination" aria-label="코스 목록 페이지">
            {page > 0 ? <Link prefetch={false} href={pageHref(page - 1, size)} aria-label="이전 페이지">← 이전</Link> : <span aria-disabled="true">← 이전</span>}
            <p><strong>{page + 1}</strong> / {courses.totalPages} <span className="sr-only">페이지</span></p>
            {page + 1 < courses.totalPages ? <Link prefetch={false} href={pageHref(page + 1, size)} aria-label="다음 페이지">다음 →</Link> : <span aria-disabled="true">다음 →</span>}
          </nav>
        </>
      ) : (
        <div className="empty-state">
          <span className="state-symbol" aria-hidden="true">○</span>
          <h3>{courses.totalElements > 0 ? "이 페이지에는 코스가 없어요" : "아직 등록된 코스가 없어요"}</h3>
          <p>{courses.totalElements > 0 ? "첫 페이지에서 달릴 코스를 찾아보세요." : "새로운 코스가 공개되면 이곳에서 확인할 수 있어요."}</p>
          {page > 0 && <Link className="button-primary" href={pageHref(0, size)}>첫 페이지로</Link>}
        </div>
      )}
    </section>
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
