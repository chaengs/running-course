import collectionStyles from "@/styles/collection.module.css";
import uiStyles from "@/styles/ui.module.css";
import layoutStyles from "@/styles/page-layout.module.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getBookmarkedCourses } from "@/lib/courses";
import { ExploreCourseCard } from "@/components/explore-course-card";
export const metadata: Metadata = { title: "찜한 코스 | Running Course" };
type Props = {
  searchParams: Promise<{
    page?: string | string[];
  }>;
};
async function Bookmarks({ searchParams }: Props) {
  const { page: rawPage = "0" } = await searchParams;
  if (
    typeof rawPage !== "string" ||
    !/^\d{1,6}$/.test(rawPage) ||
    Number(rawPage) > 100000
  )
    notFound();
  const page = Number(rawPage);
  const result = await getBookmarkedCourses(page);
  return (
    <>
      {result.content.length ? (
        <ul className={layoutStyles.courseGrid}>
          {result.content.map((course) => (
            <ExploreCourseCard
              key={course.id}
              course={course}
              privateCourse={!course.published}
              refreshOnBookmarkChange
            />
          ))}
        </ul>
      ) : (
        <section
          className={uiStyles.emptyState}
          aria-labelledby="bookmark-empty-title"
        >
          <h2 id="bookmark-empty-title">
            {page === 0
              ? "아직 찜한 코스가 없어요"
              : "이 페이지에 표시할 코스가 없어요"}
          </h2>
          <p>마음에 드는 코스의 상세 화면에서 찜해 보세요.</p>
          <Link className={collectionStyles.buttonPrimary} href="/">
            코스 둘러보기
          </Link>
        </section>
      )}
      {(page > 0 || result.hasNext) && (
        <nav
          className={collectionStyles.bookmarkPagination}
          aria-label="찜 목록 페이지"
        >
          {page > 0 && (
            <Link
              className={uiStyles.backLink}
              href={`/my/bookmarks?page=${page - 1}`}
            >
              ← 이전
            </Link>
          )}
          <span aria-current="page">{page + 1}페이지</span>
          {result.hasNext && (
            <Link
              className={uiStyles.backLink}
              href={`/my/bookmarks?page=${page + 1}`}
            >
              다음 →
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
export default function BookmarksPage(props: Props) {
  return (
    <main id="main-content" className={layoutStyles.detailPage}>
      <header className={layoutStyles.detailHeading}>
        <p className={uiStyles.eyebrow}>SAVED FOR YOUR NEXT RUN</p>
        <h1>찜한 러닝 코스</h1>
        <p className={layoutStyles.detailIntro}>
          다시 달리고 싶은 코스를 모아뒀어요.
        </p>
      </header>
      <Suspense fallback={<p role="status">찜한 코스를 불러오는 중…</p>}>
        <Bookmarks {...props} />
      </Suspense>
    </main>
  );
}
