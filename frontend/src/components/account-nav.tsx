import shellStyles from "@/components/site-shell.module.css";
import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { LogoutButton } from "./account-menu";
export async function AccountNav() {
  const user = await getCurrentUser().catch(() => null);
  return (
    <nav className={shellStyles.accountNav} aria-label="사용자 메뉴">
      <Link className={shellStyles.headerCreate} href="/courses/new">
        <span aria-hidden="true">＋</span> 코스 만들기
      </Link>
      {user ? (
        <>
          <span>{user.displayName}</span>
          <LogoutButton />
        </>
      ) : (
        <Link href="/login">로그인 →</Link>
      )}
    </nav>
  );
}
