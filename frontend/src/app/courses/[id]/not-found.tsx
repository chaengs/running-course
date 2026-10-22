import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import Link from "next/link";
export default function CourseNotFound() {
    return (<main id="main-content" className={layoutStyles.errorPage}>
      <section className={uiStyles.emptyState} aria-labelledby="not-found-title">
        <span className={uiStyles.stateSymbol} aria-hidden="true">?</span>
        <h1 id="not-found-title">코스를 찾을 수 없어요</h1>
        <p>존재하지 않거나 공개되지 않은 코스예요.<br />목록에서 다른 코스를 찾아보세요.</p>
        <Link href="/" className={uiStyles.buttonPrimary}>코스 목록으로</Link>
      </section>
    </main>);
}
