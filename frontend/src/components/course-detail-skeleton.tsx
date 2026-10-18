export function CourseDetailSkeleton() {
  return (
    <main id="main-content" className="detail-page" aria-busy="true" aria-label="코스 상세 불러오는 중">
      <p role="status" className="loading-label">코스와 경로를 불러오고 있어요…</p>
      <div className="detail-skeleton" aria-hidden="true"><span /><span /><div /></div>
    </main>
  );
}
