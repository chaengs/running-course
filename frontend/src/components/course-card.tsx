import type { CourseSummary } from "@/lib/courses";

const courseTypeLabels = { LOOP: "순환형", OUT_AND_BACK: "왕복형" };

export function CourseCard({ course }: { course: CourseSummary }) {
  const isSample = course.name.startsWith("[개발용]");
  const name = isSample ? course.name.replace(/^\[개발용\]\s*/, "") : course.name;
  const distance = new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(course.distanceMeters / 1000);

  return (
    <li className="course-card">
      <article aria-labelledby={`course-${course.id}`}>
        <div className="card-top">
          <span className="type-badge">{courseTypeLabels[course.courseType]}</span>
          {isSample && <span className="sample-badge">개발용 샘플</span>}
        </div>
        <h3 id={`course-${course.id}`}>{name}</h3>
        <p className="course-distance"><strong>{distance}</strong><span>km</span></p>
        <div className="card-footer">
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>
          <span>출발점으로 돌아오는 코스</span>
        </div>
      </article>
    </li>
  );
}
