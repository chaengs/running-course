export function CourseListSkeleton() {
  return (
    <section className="list-section" aria-busy="true" aria-label="코스 목록 불러오는 중">
      <p role="status" className="loading-label">달릴 코스를 불러오고 있어요…</p>
      <div className="skeleton-grid" aria-hidden="true">
        {[0, 1, 2, 3].map((key) => <div className="skeleton-card" key={key}><span /><span /><span /></div>)}
      </div>
    </section>
  );
}
