"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [{href:"/",label:"코스 탐색"},{href:"/courses/new",label:"코스 그리기"},{href:"/my/bookmarks",label:"북마크"},{href:"/my/courses",label:"내가 만든 코스"}];
export function SiteNavFallback() { return <NavigationLinks />; }
export function SiteNav() { return <NavigationLinks pathname={usePathname()} />; }
function NavigationLinks({ pathname = "" }: { pathname?: string }) {
 return <nav className="site-nav" aria-label="주 메뉴">{links.map(({href,label}) => <Link key={href} href={href} aria-current={(href === "/" ? pathname === "/" || /^\/courses\/\d+$/.test(pathname) : pathname.startsWith(href)) ? "page" : undefined}>{label}</Link>)}</nav>;
}
