import layoutStyles from "@/styles/page-layout.module.css";
import { LoginForm } from "@/components/login-form";
export default function LoginPage() {
  return (
    <main id="main-content" className={layoutStyles.detailPage}>
      <header className={layoutStyles.detailHeading}>
        <h1>내 러닝 코스의 시작</h1>
        <p className={layoutStyles.detailIntro}>
          로그인하고 코스를 만들고 보관하세요.
        </p>
      </header>
      <LoginForm />
    </main>
  );
}
