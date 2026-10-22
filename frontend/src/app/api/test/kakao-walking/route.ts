import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.points)) {
    return NextResponse.json({ message: "경로 지점 정보를 확인해 주세요." }, { status: 400 });
  }
  try {
    const url = new URL("/api/test/kakao-walking", process.env.BACKEND_URL ?? "http://localhost:8080");
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "백엔드에 연결하지 못했어요. 서버가 실행 중인지 확인해 주세요." }, { status: 502 });
  }
}
