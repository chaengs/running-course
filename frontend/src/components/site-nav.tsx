"use client";
import shellStyles from "@/components/site-shell.module.css";
import Link from "next/link";
import { usePathname } from "next/navigation";
const links = [
  { href: "/", label: "코스 탐색" },
  { href: "/my/bookmarks", label: "찜" },
  { href: "/my/courses", label: "내가 만든 코스" },
];
export function SiteNavFallback() {
  return <NavigationLinks />;
}
export function SiteNav() {
  return <NavigationLinks pathname={usePathname()} />;
}
function NavigationLinks({ pathname = "" }: { pathname?: string }) {
  return (
    <nav className={shellStyles.siteNav} aria-label="주 메뉴">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            (
              href === "/"
                ? pathname === "/" || /^\/courses\/\d+$/.test(pathname)
                : pathname.startsWith(href)
            )
              ? "page"
              : undefined
          }
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
