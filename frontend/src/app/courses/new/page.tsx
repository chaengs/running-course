import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { CourseEditor } from "@/components/admin/course-editor";
async function NewCourse() {
  if (!await getCurrentUser()) redirect("/login");
  return <CourseEditor />;
}
export default function NewCoursePage() {
  return <main id="main-content" className="detail-page"><Link className="back-link" href="/my/courses">← 내 코스로</Link><header className="detail-heading"><p className="eyebrow">MY COURSE STUDIO</p><h1>나만의 코스 그리기</h1><p className="detail-intro">알고 있는 러닝 길을 지도 위에 기록하세요. 저장 전에 공개 범위를 선택할 수 있어요.</p></header><Suspense fallback={<p>로그인 상태 확인 중…</p>}><NewCourse /></Suspense></main>;
}
