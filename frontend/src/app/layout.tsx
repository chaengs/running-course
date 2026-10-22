import shellStyles from "@/components/site-shell.module.css";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AccountNav } from "@/components/account-nav";
import { MyCoursesToast } from "@/components/my-courses-toast";
import { SiteNav, SiteNavFallback } from "@/components/site-nav";
import "./reset.css";
import "@/styles/palette.css";
import "./globals.css";
export const metadata: Metadata = {
  title: "Running Course | 러닝 코스 탐색",
  description: "출발점으로 돌아오는 러닝 코스를 거리와 유형으로 살펴보세요.",
};
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        <a className={shellStyles.skipLink} href="#main-content">
          본문으로 건너뛰기
        </a>
        <div className={shellStyles.siteHeader}>
          <Link
            href="/"
            className={shellStyles.brand}
            aria-label="Running Course 홈"
          >
            <Image
              className={shellStyles.brandLogo}
              src="/running-course-logo.png"
              alt="RUNNING COURSE"
              width={1440}
              height={360}
              priority
            />
          </Link>
          <Suspense fallback={<SiteNavFallback />}>
            <SiteNav />
          </Suspense>
          <Suspense
            fallback={
              <span className={shellStyles.headerCaption}>
                사용자 메뉴 준비 중
              </span>
            }
          >
            <AccountNav />
          </Suspense>
        </div>
        {children}
        <MyCoursesToast />
        <footer className={shellStyles.siteFooter}>
          <div>
            <strong>
              RUNNING <b>COURSE</b>
            </strong>
            <p>오늘, 나만의 길을 달리다. 모든 러너를 위한 코스 기록 플랫폼.</p>
          </div>
          <span>© RUNNING COURSE. All rights reserved.</span>
        </footer>
      </body>
    </html>
  );
}
