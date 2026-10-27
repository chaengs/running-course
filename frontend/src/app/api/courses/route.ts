import { proxyCourseMutation } from "@/lib/course-proxy";
import { parseCourseListQuery } from "@/lib/course-search";
import { sessionHeaders } from "@/lib/session";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const query = parseCourseListQuery(
    Object.fromEntries(request.nextUrl.searchParams.entries()),
  );
  if (!query) return NextResponse.json({ message: "검색 조건이 올바르지 않아요." }, { status: 400 });

  const backendUrl = new URL("/api/courses/feed", process.env.BACKEND_URL ?? "http://localhost:8080");
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) backendUrl.searchParams.set(key, String(value));
  }

  try {
    const response = await fetch(backendUrl, {
      headers: await sessionHeaders(),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return NextResponse.json({ message: "코스를 불러오지 못했어요." }, { status: 502 });
    return NextResponse.json(await response.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ message: "코스를 불러오지 못했어요." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) { return proxyCourseMutation(request); }
