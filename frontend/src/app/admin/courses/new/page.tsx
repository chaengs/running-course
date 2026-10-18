import Link from "next/link";
import { CourseEditor } from "@/components/admin/course-editor";

export default function NewCoursePage() {
  return <main id="main-content" className="detail-page">
    <Link className="back-link" href="/">← 코스 목록으로</Link>
    <header className="detail-heading"><p className="eyebrow">COURSE STUDIO</p><h1>새로운 코스 그리기</h1><p className="detail-intro">알고 있는 러닝 길을 지도 위에 차근차근 기록하세요.</p></header>
    <CourseEditor />
  </main>;
}
