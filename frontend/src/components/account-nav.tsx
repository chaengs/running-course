import Link from "next/link";
import { getCurrentUser } from "@/lib/session";
import { LogoutButton } from "./account-menu";
export async function AccountNav() {
 const user = await getCurrentUser().catch(() => null);
 return <nav className="account-nav" aria-label="사용자 메뉴"><Link className="header-create" href="/courses/new"><span aria-hidden="true">＋</span> 코스 만들기</Link>{user ? <><span className="user-avatar" aria-hidden="true">{user.displayName.slice(0,1)}</span><span>{user.displayName}</span><LogoutButton /></> : <Link href="/login">로그인 →</Link>}</nav>;
}
