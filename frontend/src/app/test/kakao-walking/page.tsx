import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import layoutStyles from "@/styles/page-layout.module.css";
import uiStyles from "@/styles/ui.module.css";
import { KakaoWalkingTester } from "@/components/kakao-walking-tester";
import styles from "./page.module.css";

export default async function KakaoWalkingTestPage() {
  if (!(await getCurrentUser())) redirect("/login");
  return (
    <main id="main-content" className={`${layoutStyles.detailPage} ${styles.page}`}>
      <header className={layoutStyles.detailHeading}>
        <p className={uiStyles.eyebrow}>API EXPERIMENT</p>
        <h1>카카오 도보 경로 테스트</h1>
        <p>코스 만들기 화면과 같은 조작으로 점을 추가·이동·삭제하고, 카카오 도보 경로와 고도 프로필을 확인해 보세요.</p>
      </header>
      <KakaoWalkingTester />
    </main>
  );
}
