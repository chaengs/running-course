import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountNav } from "@/components/account-nav";
import "./globals.css";

export const metadata: Metadata = {
  title: "Running Course | 러닝 코스 탐색",
  description: "출발점으로 돌아오는 러닝 코스를 거리와 유형으로 살펴보세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko"><body>
      <a className="skip-link" href="#main-content">본문으로 건너뛰기</a>
      <div className="site-header"><Link href="/" className="brand" aria-label="Running Course 홈"><span className="brand-mark" aria-hidden="true">rc.</span><span>RUNNING COURSE</span></Link><Suspense fallback={<span className="header-caption">사용자 메뉴 준비 중</span>}><AccountNav /></Suspense></div>
      {children}
      <footer className="site-footer"><span>RUNNING COURSE</span><span>오늘도, 나만의 페이스로.</span></footer>
    </body></html>
  );
}
