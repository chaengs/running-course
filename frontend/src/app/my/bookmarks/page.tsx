import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBookmarkedCourses } from "@/lib/courses";
import { courseDisplayName, courseTypeLabels, formatDistance } from "@/lib/course-format";
import { CourseBookmarkButton } from "@/components/course-bookmark-button";

export const metadata: Metadata = { title: "북마크한 코스 | Running Course" };
type Props = { searchParams: Promise<{ page?: string | string[] }> };

async function Bookmarks({ searchParams }: Props) {
  if (!await getCurrentUser()) redirect("/login");
  const { page: rawPage = "0" } = await searchParams;
  if (typeof rawPage !== "string" || !/^\d{1,6}$/.test(rawPage) || Number(rawPage) > 100000) notFound();
  const page = Number(rawPage);
  const result = await getBookmarkedCourses(page);
  return <>
    {result.content.length ? <ul className="course-grid">{result.content.map((course) => <li className="course-card" key={course.id}>
      <span className="type-badge">{courseTypeLabels[course.courseType]}</span>
      <h2><Link className="course-detail-link" href={`/courses/${course.id}`} prefetch={false}>{courseDisplayName(course.name)}</Link></h2>
      <p className="course-distance"><strong>{formatDistance(course.distanceMeters)}</strong><span>km</span></p>
      <CourseBookmarkButton courseId={course.id} initialBookmarked refreshOnChange />
    </li>)}</ul> : <section className="empty-state" aria-labelledby="bookmark-empty-title">
      <h2 id="bookmark-empty-title">{page === 0 ? "아직 북마크한 공개 코스가 없어요" : "이 페이지에 표시할 코스가 없어요"}</h2>
      <p>마음에 드는 코스의 상세 화면에서 북마크해 보세요.</p>
      <Link className="button-primary" href="/">코스 둘러보기</Link>
    </section>}
    {(page > 0 || result.hasNext) && <nav className="bookmark-pagination" aria-label="북마크 목록 페이지">
      {page > 0 && <Link className="back-link" href={`/my/bookmarks?page=${page - 1}`}>← 이전</Link>}
      <span aria-current="page">{page + 1}페이지</span>
      {result.hasNext && <Link className="back-link" href={`/my/bookmarks?page=${page + 1}`}>다음 →</Link>}
    </nav>}
  </>;
}

export default function BookmarksPage(props: Props) {
  return <main id="main-content" className="detail-page">
    <header className="detail-heading"><p className="eyebrow">SAVED FOR YOUR NEXT RUN</p><h1>북마크한 코스</h1><p className="detail-intro">다시 달리고 싶은 코스를 모아뒀어요.</p></header>
    <p className="map-caption">최근 북마크한 순서로 20개씩 표시합니다. 비공개로 바뀌거나 삭제된 코스는 표시되지 않아요.</p>
    <Suspense fallback={<p role="status">북마크한 코스를 불러오는 중…</p>}><Bookmarks {...props} /></Suspense>
  </main>;
}
