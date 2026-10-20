import collectionStyles from "@/styles/collection.module.css";
import myStyles from "@/app/my/courses/page.module.css";
import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import { MyCourseRowActions } from "@/components/my-course-row-actions";
import { MyCoursesToast } from "@/components/my-courses-toast";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getMyCourses, type MyCourse } from "@/lib/courses";
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

const filters: { value: VisibilityFilter; label: string }[] = [
  { value: "all", label: "전체 코스" },
  { value: "published", label: "공개" },
  { value: "private", label: "비공개" },
];

function count(value: number) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

function formatCreatedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function MetricCard({
  label,
  value,
  unit,
  icon,
  description,
}: {
  label: string;
  value: string;
  unit: string;
  icon: "courses" | "distance" | "views" | "bookmarks";
  description: string;
}) {
  const iconPaths = {
    courses: "M4 5h16M4 12h16M4 19h10M2 5h.01M2 12h.01M2 19h.01",
    distance: "M3 18c3-8 5-8 8-3s5 5 10-7M17 8l4 0 0 4",
    views:
      "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z",
    bookmarks:
      "M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z",
  };

  return (
    <article className={myStyles.metricCard}>
      <div className={myStyles.metricTop}>
        <p className={uiStyles.eyebrow}>{label}</p>
        <span className={myStyles.metricIcon} aria-hidden="true">
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d={iconPaths[icon]} />
          </svg>
        </span>
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
          icon="courses"
          description="내가 직접 만든 러닝 코스"
        />
        <MetricCard
          label="TOTAL DISTANCE"
          value={formatDistance(stats.totalDistanceMeters)}
          unit="km"
          icon="distance"
          description="저장된 전체 코스 거리"
        />
        <MetricCard
          label="RUNNER BOOKMARKS"
          value={count(stats.totalBookmarks)}
          unit="개"
          icon="bookmarks"
          description="러너들이 내 코스를 북마크한 수"
        />
        <MetricCard
          label="TOTAL VIEWS"
          value={count(stats.totalViews)}
          unit="회"
          icon="views"
          description="내 코스 상세 페이지 누적 조회"
        />
      </section>

      <section
        className={myStyles.courseCollection}
        aria-labelledby="my-course-list"
      >
        <div className={myStyles.collectionToolbar}>
          <div>
            <p className={uiStyles.eyebrow}>COURSE LIBRARY</p>
            <h2 id="my-course-list">내가 만든 코스</h2>
          </div>
          <form className={myStyles.sortForm} action="/my/courses" method="get">
            <input type="hidden" name="visibility" value={visibility} />
            <label htmlFor="course-sort">정렬</label>
            <select id="course-sort" name="sort" defaultValue={sort}>
              <option value="recent">최근 작성순</option>
              <option value="views">조회 많은 순</option>
              <option value="bookmarks">북마크 많은 순</option>
            </select>
            <button type="submit">적용</button>
          </form>
        </div>

        <div className={myStyles.tableToolbar}>
          <nav className={myStyles.filterTabs} aria-label="공개 범위 필터">
            {filters.map((filter) => (
              <Link
                key={filter.value}
                href={`/my/courses?visibility=${filter.value}&sort=${sort}&page=0`}
                aria-current={visibility === filter.value ? "page" : undefined}
                className={
                  visibility === filter.value
                    ? myStyles.activeFilter
                    : undefined
                }
              >
                {filter.label}
                <span>
                  {count(
                    filter.value === "all"
                      ? stats.totalCourses
                      : filter.value === "published"
                        ? stats.publishedCourses
                        : stats.privateCourses,
                  )}
                </span>
              </Link>
            ))}
          </nav>
          <p className={myStyles.resultCount}>{count(visibleCount)}개 표시</p>
        </div>

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
        ) : content.length > 0 ? (
          <div className={myStyles.courseTableScroll}>
            <table className={myStyles.courseTable}>
              <thead>
                <tr>
                  <th scope="col">코스 이름</th>
                  <th scope="col">생성일</th>
                  <th scope="col">코스 유형</th>
                  <th scope="col">총 거리</th>
                  <th scope="col">총 북마크 수</th>
                  <th scope="col">총 조회수</th>
                  <th scope="col">공개 상태</th>
                  <th scope="col">
                    <span className={uiStyles.srOnly}>관리</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {content.map((course: MyCourse) => (
                  <CourseRow key={course.id} course={course} />
                ))}
              </tbody>
            </table>
          </div>
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

function CourseRow({ course }: { course: MyCourse }) {
  const name = course.name;
  const courseTypeLabel = course.courseType === "LOOP" ? "순환형" : "왕복형";
  const region = course.region
    ? [course.region.sido, course.region.sigungu, course.region.eupMyeonDong]
        .filter(Boolean)
        .join(" ")
    : "";
  return (
    <tr>
      <td className={myStyles.courseNameCell}>
        <div className={myStyles.courseNameText}>
          <Link prefetch={false} href={`/courses/${course.id}`}>
            {name}
          </Link>
          {region && (
            <span className={myStyles.courseRegion}>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                focusable="false"
              >
                <path
                  d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <circle
                  cx="12"
                  cy="10"
                  r="2.5"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
              </svg>
              <span>{region}</span>
            </span>
          )}
        </div>
      </td>
      <td className={myStyles.dateCell}>{formatCreatedAt(course.createdAt)}</td>
      <td>
        <span className={myStyles.courseTypeBadge}>{courseTypeLabel}</span>
      </td>
      <td className={myStyles.distanceCell}>
        <strong>{formatDistance(course.distanceMeters)}</strong>
        <span>km</span>
      </td>
      <td>
        <span className={myStyles.metricCell}>
          {count(course.bookmarkCount)}
        </span>
      </td>
      <td>
        <span className={myStyles.metricCell}>{count(course.viewCount)}</span>
      </td>
      <td>
        <span
          className={`${myStyles.statusBadge} ${course.published ? myStyles.published : myStyles.private}`}
        >
          <span aria-hidden="true">{course.published ? "●" : "○"}</span>{" "}
          {course.published ? "공개" : "비공개"}
        </span>
      </td>
      <td>
        <MyCourseRowActions
          id={course.id}
          name={name}
          published={course.published}
        />
      </td>
    </tr>
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
      <MyCoursesToast />
    </main>
  );
}
