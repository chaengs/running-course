import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { LogoutButton } from "./account-menu";
export async function AccountNav() {
  const user = await getCurrentUser().catch(() => null);
  return <nav className="account-nav" aria-label="사용자 메뉴"><Link href="/courses/new">코스 만들기</Link>{user ? <><Link href="/my/courses">내 코스</Link><Link href="/my/bookmarks">북마크</Link><span>{user.displayName}</span><LogoutButton /></> : <Link href="/login">로그인</Link>}</nav>;
}
