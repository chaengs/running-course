import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountNav } from "@/components/account-nav";
import { SiteNav, SiteNavFallback } from "@/components/site-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Running Course | 러닝 코스 탐색",
  description: "출발점으로 돌아오는 러닝 코스를 거리와 유형으로 살펴보세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko"><body>
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <div className="site-header"><Link href="/" className="brand" aria-label="Running Course 홈"><span className="brand-mark" aria-hidden="true">↗</span><span>RUNNING <b>COURSE</b></span></Link><Suspense fallback={<SiteNavFallback />}><SiteNav /></Suspense><Suspense fallback={<span className="header-caption">사용자 메뉴 준비 중</span>}><AccountNav /></Suspense></div>
      {children}
      <footer className="site-footer"><div><strong>RUNNING <b>COURSE</b></strong><p>오늘, 나만의 길을 달리다. 모든 러너를 위한 커뮤니티 플랫폼.</p></div><span>© RUNNING COURSE. All rights reserved.</span></footer>
    </body></html>
  );
}
