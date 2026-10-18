import Link from "next/link";

export default function CourseNotFound() {
  return (
    <main id="main-content" className="error-page">
      <section className="empty-state" aria-labelledby="not-found-title">
        <span className="state-symbol" aria-hidden="true">?</span>
        <h1 id="not-found-title">코스를 찾을 수 없어요</h1>
        <p>존재하지 않거나 공개되지 않은 코스예요.<br />목록에서 다른 코스를 찾아보세요.</p>
        <Link href="/" className="button-primary">코스 목록으로</Link>
      </section>
    </main>
  );
}
