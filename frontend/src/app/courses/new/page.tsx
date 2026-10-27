import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { NewCourseEditor } from "@/components/admin/new-course-editor";
async function NewCourse() {
  if (!(await getCurrentUser())) redirect("/login");
  return <NewCourseEditor />;
}
export default function NewCoursePage() {
  return (
    <main id="main-content" className={layoutStyles.detailPage}>
      <header className={layoutStyles.detailHeading}>
        <p className={uiStyles.eyebrow}>MY COURSE STUDIO</p>
        <h1>나만의 코스 그리기</h1>
      </header>
      <Suspense fallback={<p>로그인 상태 확인 중…</p>}>
        <NewCourse />
      </Suspense>
    </main>
  );
}
