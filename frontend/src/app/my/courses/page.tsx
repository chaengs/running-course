import collectionStyles from "@/styles/collection.module.css";
import myStyles from "@/app/my/courses/page.module.css";
import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getMyCourses } from "@/lib/courses";
import { courseDisplayName, formatDistance } from "@/lib/course-format";
async function MyCourses() {
    if (!await getCurrentUser())
        redirect("/login");
    const courses = await getMyCourses();
    const published = courses.filter(course => course.published).length;
    return <>
 <div className={collectionStyles.collectionBanner}><div><span className={uiStyles.eyebrow}>나의 러닝 코스</span><strong>{courses.length}<small>개</small></strong><p>공개 {published} · 비공개 {courses.length - published}</p></div><div><span className={uiStyles.eyebrow}>총 코스 거리</span><strong>{formatDistance(courses.reduce((sum, course) => sum + course.distanceMeters, 0))}<small>km</small></strong><div className={collectionStyles.metricLine}/></div><div><span className={uiStyles.eyebrow}>MY RUNNING SPACE</span><p>직접 기록한 길을 관리하고<br />다른 러너에게 공유해 보세요.</p></div></div>
 {courses.length ? <section className={myStyles.myCoursePanel} aria-labelledby="my-course-list"><div className={layoutStyles.listToolbar}><h2 id="my-course-list">전체 코스 <span className={uiStyles.courseCount}>{courses.length}</span></h2><span className={uiStyles.mapCaption}>최근 작성한 순서</span></div><div className={myStyles.courseTableScroll}><table className={myStyles.courseTable}><thead><tr><th scope="col">코스 이름</th><th scope="col">거리</th><th scope="col">공개 상태</th><th scope="col">관리</th></tr></thead><tbody>{courses.map(course => <tr key={course.id}><td><Link prefetch={false} href={`/courses/${course.id}`}><span className={myStyles.tableRouteIcon} aria-hidden="true">⌁</span>{courseDisplayName(course.name)}</Link></td><td><strong>{formatDistance(course.distanceMeters)}</strong> km</td><td><span className={myStyles.statusBadge + " " + (course.published ? myStyles.published : myStyles.private)}>{course.published ? "● 공개 중" : "비공개"}</span></td><td><Link className={myStyles.tableEdit} href={`/courses/${course.id}/edit`} aria-label={`${courseDisplayName(course.name)} 수정`}>수정 ↗</Link></td></tr>)}</tbody></table></div></section> : <div className={uiStyles.emptyState}><h2>아직 만든 코스가 없어요</h2><p>지도를 보며 첫 코스를 그려보세요.</p><Link className={collectionStyles.buttonPrimary} href="/courses/new">첫 코스 그리기 →</Link></div>}
 </>;
}
export default function MyCoursesPage() {
    return <main id="main-content" className={layoutStyles.detailPage}><header className={layoutStyles.detailHeading + " " + collectionStyles.collectionHeading}><div><p className={uiStyles.eyebrow}>COURSE LIBRARY · MY RUNNING SPACE</p><h1>내가 만든 코스</h1><p className={layoutStyles.detailIntro}>직접 그린 길부터 나만의 히든 러닝 코스까지. 오늘의 발자취를 관리하세요.</p></div><Link className={collectionStyles.buttonPrimary} href="/courses/new">＋ 새 코스 그리기</Link></header><p className={uiStyles.mapCaption}>최근 작성한 코스 최대 100개를 표시합니다.</p><Suspense fallback={<p role="status">내 코스를 불러오는 중…</p>}><MyCourses /></Suspense></main>;
}
