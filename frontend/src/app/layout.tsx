import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Running Course | 러닝 코스 탐색",
  description: "내 주변에서 원하는 거리의 러닝 코스를 찾아보세요.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ko"><body>{children}</body></html>;
}
