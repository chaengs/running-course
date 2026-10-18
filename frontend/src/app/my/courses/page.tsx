import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { getMyCourses } from "@/lib/courses";
import { formatDistance } from "@/lib/course-format";
async function MyCourses() {
  if (!await getCurrentUser()) redirect("/login");
  const courses = await getMyCourses();
  return courses.length ? <ul className="course-grid">{courses.map((course) => <li className="course-card" key={course.id}><span className="type-badge">{course.published ? "공개" : "비공개"}</span><h2><Link href={`/courses/${course.id}`}>{course.name}</Link></h2><p>{formatDistance(course.distanceMeters)}km</p><Link className="back-link" href={`/courses/${course.id}/edit`}>수정하기 →</Link></li>)}</ul> : <div className="empty-state"><h2>아직 만든 코스가 없어요</h2><p>지도를 보며 첫 코스를 그려보세요.</p></div>;
}
export default function MyCoursesPage() {
  return <main id="main-content" className="detail-page"><header className="detail-heading"><h1>내가 만든 코스</h1><Link className="button-primary" href="/courses/new">새 코스 만들기</Link></header><p className="map-caption">최근 작성한 코스 최대 100개를 표시합니다.</p><Suspense fallback={<p>내 코스를 불러오는 중…</p>}><MyCourses /></Suspense></main>;
}
