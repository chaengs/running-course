import homeStyles from "@/app/home.module.css";
import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { HOME_INTRO_DISMISSED_COOKIE } from "@/lib/home-intro";
import { InfiniteCourseList } from "@/components/infinite-course-list";
import { CourseListSkeleton } from "@/components/course-list-skeleton";
import { CourseSearchForm } from "@/components/course-search-form";
import { CourseResultsError } from "@/components/course-results-error";
import { HomeServiceIntro } from "@/components/home-service-intro";
import {
  courseListHref,
  parseCourseListQuery,
  type CourseListQuery,
} from "@/lib/course-search";
import { getCourses } from "@/lib/courses";
type SearchParams = Promise<{
  [key: string]: string | string[] | undefined;
}>;
async function CourseSearch({ searchParams }: { searchParams: SearchParams }) {
  const rawQuery = await searchParams;
  const query = parseCourseListQuery(rawQuery);
  if (!query) redirect("/");
  const {
    latitude,
    longitude,
    radiusMeters,
    targetDistanceMeters,
    minimumDistanceMeters,
  } = query;
  const filters = {
    latitude,
    longitude,
    radiusMeters,
    targetDistanceMeters,
    minimumDistanceMeters,
  };
  return (
    <>
      <CourseSearchForm
        key={`${latitude}-${longitude}-${radiusMeters}-${targetDistanceMeters}-${minimumDistanceMeters}`}
        filters={filters}
      />
      <Suspense key={courseListHref(query)} fallback={<CourseListSkeleton />}>
        <CourseResults query={query} />
      </Suspense>
    </>
  );
}
async function CourseResults({ query }: { query: CourseListQuery }) {
  const {
    page,
    size,
    latitude,
    longitude,
    radiusMeters,
    targetDistanceMeters,
    minimumDistanceMeters,
  } = query;
  const filters = {
    latitude,
    longitude,
    radiusMeters,
    targetDistanceMeters,
    minimumDistanceMeters,
  };
  const courses = await getCourses(page, size, filters).catch(() => null);
  if (!courses) return <CourseResultsError />;
  const hasLocation = latitude !== undefined;
  const hasFilters =
    hasLocation ||
    targetDistanceMeters !== undefined ||
    minimumDistanceMeters !== undefined;
  return (
    <>
      <section
        className={homeStyles.listSection}
        aria-labelledby="courses-title"
      >
        <div className={layoutStyles.listToolbar}>
          <div>
            <p className={uiStyles.eyebrow}>FIND YOUR NEXT RUN</p>
            <h2 id="courses-title">러닝 코스</h2>
          </div>
        </div>
        {courses.content.length > 0 ? (
          <InfiniteCourseList
            key={courseListHref(query)}
            initialPage={courses}
            query={query}
          />
        ) : (
          <div className={uiStyles.emptyState}>
            <h3>
              {page > 0
                ? "이 페이지에는 코스가 없어요"
                : hasFilters
                  ? "조건에 맞는 코스가 없어요"
                  : "아직 등록된 코스가 없어요"}
            </h3>
            <p>
              {page > 0
                ? "첫 페이지에서 달릴 코스를 찾아보세요."
                : hasFilters
                  ? "검색 반경을 넓히거나 목표 거리를 바꿔보세요."
                  : "새로운 코스가 공개되면 이곳에서 확인할 수 있어요."}
            </p>
            {page > 0 ? (
              <Link
                className={uiStyles.buttonPrimary}
                href={courseListHref(query, 0)}
              >
                첫 페이지로
              </Link>
            ) : (
              hasFilters && (
                <Link className={uiStyles.buttonPrimary} href="/">
                  전체 코스 보기
                </Link>
              )
            )}
          </div>
        )}
      </section>
    </>
  );
}
export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const initiallyDismissed =
    (await cookies()).get(HOME_INTRO_DISMISSED_COOKIE)?.value === "true";

  return (
    <main id="main-content">
      <HomeServiceIntro initiallyDismissed={initiallyDismissed} />
      <header className={homeStyles.hero}>
        <p className={uiStyles.eyebrow}>
          <span className={uiStyles.liveDot} /> A NEW ROUTE · YOUR OWN PACE
        </p>
        <h1>
          다음 달리기는,
          <br />
          <em>새로운 코스에서</em>
        </h1>
        <div className={homeStyles.heroNote}>
          <span className={homeStyles.noteLine} />
          길을 고르는 시간은 줄이고, 달리는 시간을 늘려요.
        </div>
      </header>
      <Suspense fallback={<CourseListSkeleton />}>
        <CourseSearch searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
