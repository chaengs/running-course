import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import loadingStyles from "@/components/loading.module.css";
export function CourseDetailSkeleton() {
    return (<main id="main-content" className={layoutStyles.detailPage} aria-busy="true" aria-label="코스 상세 불러오는 중">
      <p role="status" className={uiStyles.loadingLabel}>코스와 경로를 불러오고 있어요…</p>
      <div className={loadingStyles.detailSkeleton} aria-hidden="true"><span /><span /><div /></div>
    </main>);
}
