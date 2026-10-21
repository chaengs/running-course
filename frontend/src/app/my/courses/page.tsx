import collectionStyles from "@/styles/collection.module.css";
import myStyles from "@/app/my/courses/page.module.css";
import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import { MyCourseTable } from "@/components/my-course-table";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getMyCourses } from "@/lib/courses";
import { formatDistance } from "@/lib/course-format";

type VisibilityFilter = "all" | "published" | "private";
type CourseSort = "recent" | "views" | "bookmarks";
type PageProps = {
  searchParams: Promise<{
    visibility?: string | string[];
    sort?: string | string[];
    page?: string | string[];
  }>;
};

function count(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function MetricCard({
  label,
  value,
  unit,
  description,
}: {
  label: string;
  value: string;
  unit: string;
  description: string;
}) {
  return (
    <article className={myStyles.metricCard}>
      <div className={myStyles.metricTop}>
        <p className={uiStyles.eyebrow}>{label}</p>
      </div>
      <p className={myStyles.metricValue}>
        <strong>{value}</strong>
        <span>{unit}</span>
      </p>
      <p className={myStyles.metricDescription}>{description}</p>
    </article>
  );
}

async function MyCourses({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rawParams = await searchParams;
  const rawVisibility = Array.isArray(rawParams.visibility)
    ? rawParams.visibility[0]
    : rawParams.visibility;
  const rawSort = Array.isArray(rawParams.sort)
    ? rawParams.sort[0]
    : rawParams.sort;
  const rawPage = Array.isArray(rawParams.page)
    ? rawParams.page[0]
    : rawParams.page;
  const visibility: VisibilityFilter =
    rawVisibility === "published" || rawVisibility === "private"
      ? rawVisibility
      : "all";
  const sort: CourseSort =
    rawSort === "views" || rawSort === "bookmarks" ? rawSort : "recent";
  const requestedPage = rawPage && /^\d+$/.test(rawPage) ? Number(rawPage) : 0;
  const { content, stats, page, totalPages } = await getMyCourses(
    requestedPage,
    visibility,
    sort,
  );
  const visibleCount =
    visibility === "all"
      ? stats.totalCourses
      : visibility === "published"
        ? stats.publishedCourses
        : stats.privateCourses;

  return (
    <>
      <section className={myStyles.metricsGrid} aria-label="내 러닝 코스 요약">
        <MetricCard
          label="MY COURSES"
          value={count(stats.totalCourses)}
          unit="개"
          description="내가 직접 만든 러닝 코스"
        />
        <MetricCard
          label="TOTAL DISTANCE"
          value={formatDistance(stats.totalDistanceMeters)}
          unit="km"
          description="저장된 전체 코스 거리"
        />
        <MetricCard
          label="RUNNER BOOKMARKS"
          value={count(stats.totalBookmarks)}
          unit="개"
          description="러너들이 내 코스를 찜한 수"
        />
        <MetricCard
          label="TOTAL VIEWS"
          value={count(stats.totalViews)}
          unit="회"
          description="내 코스 상세 페이지 누적 조회"
        />
      </section>

      <section
        className={myStyles.courseCollection}
        aria-labelledby="my-course-list"
      >
        <MyCourseTable
          key={`${visibility}-${sort}-${page}`}
          courses={content}
          visibility={visibility}
          sort={sort}
          counts={{
            all: stats.totalCourses,
            published: stats.publishedCourses,
            private: stats.privateCourses,
          }}
          visibleCount={visibleCount}
        />

        {visibleCount === 0 ? (
          visibility === "all" ? (
            <div className={uiStyles.emptyState}>
              <h2>아직 만든 코스가 없어요</h2>
              <p>지도를 보며 첫 코스를 그려보세요.</p>
              <Link
                className={collectionStyles.buttonPrimary}
                href="/courses/new"
              >
                첫 코스 그리기 →
              </Link>
            </div>
          ) : (
            <div className={myStyles.noResults}>
              <p>선택한 공개 범위에 해당하는 코스가 없어요.</p>
              <Link href={`/my/courses?visibility=all&sort=${sort}&page=0`}>
                전체 코스 보기
              </Link>
            </div>
          )
        ) : null}
        {totalPages > 1 && (
          <nav className={myStyles.pagination} aria-label="내 코스 페이지 이동">
            {page > 0 ? (
              <Link
                href={`/my/courses?visibility=${visibility}&sort=${sort}&page=${page - 1}`}
                aria-label="이전 페이지"
              >
                ← 이전
              </Link>
            ) : (
              <span aria-disabled="true">← 이전</span>
            )}
            <p>
              <strong>{page + 1}</strong> / {totalPages}
              <span className={uiStyles.srOnly}>페이지</span>
            </p>
            {page + 1 < totalPages ? (
              <Link
                href={`/my/courses?visibility=${visibility}&sort=${sort}&page=${page + 1}`}
                aria-label="다음 페이지"
              >
                다음 →
              </Link>
            ) : (
              <span aria-disabled="true">다음 →</span>
            )}
          </nav>
        )}
      </section>
    </>
  );
}

export default function MyCoursesPage(props: PageProps) {
  return (
    <main id="main-content" className={layoutStyles.detailPage}>
      <header
        className={`${layoutStyles.detailHeading} ${collectionStyles.collectionHeading} ${myStyles.pageHeading}`}
      >
        <div>
          <p className={uiStyles.eyebrow}>COURSE LIBRARY · MY RUNNING SPACE</p>
          <h1>내가 만든 코스</h1>
          <p className={layoutStyles.detailIntro}>
            직접 그린 길부터 나만의 러닝 코스까지, 기록과 공유 현황을 한곳에서
            관리하세요.
          </p>
        </div>
        <Link className={collectionStyles.buttonPrimary} href="/courses/new">
          <span aria-hidden="true">＋</span> 새 코스 그리기
        </Link>
      </header>
      <Suspense
        fallback={
          <p role="status" className={myStyles.loadingState}>
            내 코스 통계를 불러오는 중…
          </p>
        }
      >
        <MyCourses searchParams={props.searchParams} />
      </Suspense>
    </main>
  );
}
