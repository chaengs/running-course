import Link from "next/link";
import { sessionHeaders } from "@/lib/session";
import { CourseBookmarkButton } from "./course-bookmark-button";

export async function CourseBookmark({ courseId, loggedIn }: { courseId: number; loggedIn: boolean }) {
  if (!loggedIn) return <p><Link className="back-link" href="/login">로그인하고 코스 북마크하기 →</Link></p>;
  let bookmarked: boolean | null = null;
  try {
    const response = await fetch(new URL(`/api/my/bookmarks/${courseId}`, process.env.BACKEND_URL ?? "http://localhost:8080"), {
      headers: await sessionHeaders(), cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error("bookmark status unavailable");
    const status: { bookmarked: boolean } = await response.json();
    bookmarked = status.bookmarked;
  } catch { /* Keep the course and map available if bookmark lookup fails. */ }
  if (bookmarked === null) return <p role="status">북마크 상태를 확인하지 못했어요. 페이지를 새로고침해 주세요.</p>;
  return <CourseBookmarkButton key={`${courseId}-${bookmarked}`} courseId={courseId} initialBookmarked={bookmarked} />;
}
