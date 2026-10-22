import homeStyles from "@/app/home.module.css";
import uiStyles from "@/styles/ui.module.css";
import loadingStyles from "@/components/loading.module.css";
export function CourseListSkeleton() {
    return (<section className={homeStyles.listSection} aria-busy="true" aria-label="코스 목록 불러오는 중">
      <p role="status" className={uiStyles.loadingLabel}>달릴 코스를 불러오고 있어요…</p>
      <div className={loadingStyles.skeletonGrid} aria-hidden="true">
        {[0, 1, 2, 3].map((key) => <div className={loadingStyles.skeletonCard} key={key}><span /><span /><span /></div>)}
      </div>
    </section>);
}
