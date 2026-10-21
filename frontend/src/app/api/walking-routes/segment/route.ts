import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) {
    return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  }
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "경로 지점 정보를 확인해 주세요." }, { status: 400 });
  }
  try {
    const response = await fetch(
      new URL("/api/walking-routes/segment", process.env.BACKEND_URL ?? "http://localhost:8080"),
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        cache: "no-store",
        signal: AbortSignal.timeout(20000),
      },
    );
    const result = await response.json().catch(() => ({}));
    return NextResponse.json(result, { status: response.status, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ message: "도보 경로 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요." }, { status: 502 });
  }
}
