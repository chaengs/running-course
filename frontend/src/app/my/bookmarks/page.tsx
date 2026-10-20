import collectionStyles from "@/styles/collection.module.css";
import uiStyles from "@/styles/ui.module.css";
import layoutStyles from "@/styles/page-layout.module.css";
import cardStyles from "@/components/course-card.module.css";
import previewStyles from "@/components/route-preview.module.css";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getBookmarkedCourses } from "@/lib/courses";
import { courseTypeLabels, formatDistance } from "@/lib/course-format";
import { RoutePreview } from "@/components/route-preview";
import { CourseBookmarkButton } from "@/components/course-bookmark-button";
export const metadata: Metadata = { title: "찜한 코스 | Running Course" };
type Props = {
  searchParams: Promise<{
    page?: string | string[];
  }>;
};
async function Bookmarks({ searchParams }: Props) {
  if (!(await getCurrentUser())) redirect("/login");
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
      <div className={collectionStyles.collectionBanner}>
        <div>
          <span className={uiStyles.eyebrow}>SAVED COURSES · 현재 페이지</span>
          <strong>
            {result.content.length}
            <small>개 코스</small>
          </strong>
        </div>
        <div>
          <span className={uiStyles.eyebrow}>TOTAL DISTANCE · 현재 페이지</span>
          <strong>
            {formatDistance(
              result.content.reduce(
                (sum, course) => sum + course.distanceMeters,
                0,
              ),
            )}
            <small>km</small>
          </strong>
        </div>
        <div className={collectionStyles.collectionNote}>
          <span className={uiStyles.liveDot} /> 다음 러닝을 위한 나만의 컬렉션
        </div>
      </div>
      {result.content.length ? (
        <ul className={layoutStyles.courseGrid}>
          {result.content.map((course) => (
            <li
              className={cardStyles.courseCard + " " + cardStyles.bookmarkCard}
              key={course.id}
            >
              <RoutePreview
                className={previewStyles.bookmarkPreview}
                courseId={course.id}
                name={course.name}
              />
              <span className={uiStyles.typeBadge}>
                {courseTypeLabels[course.courseType]}
              </span>
              <h2>
                <Link
                  className={cardStyles.courseDetailLink}
                  href={`/courses/${course.id}`}
                  prefetch={false}
                >
                  {course.name}
                </Link>
              </h2>
              <p className={cardStyles.courseDistance}>
                <strong>{formatDistance(course.distanceMeters)}</strong>
                <span>km</span>
              </p>
              <CourseBookmarkButton
                className={cardStyles.cardBookmark}
                courseId={course.id}
                initialBookmarked
                refreshOnChange
              />
            </li>
          ))}
        </ul>
      ) : (
        <section
          className={uiStyles.emptyState}
          aria-labelledby="bookmark-empty-title"
        >
          <h2 id="bookmark-empty-title">
            {page === 0
              ? "아직 찜한 공개 코스가 없어요"
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
