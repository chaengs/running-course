import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function proxyCourseMutation(request: NextRequest, suffix = "") {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  try {
    const response = await fetch(new URL(`/api/my/courses${suffix}`, process.env.BACKEND_URL ?? "http://localhost:8080"), {
      method: request.method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: request.method === "DELETE" ? undefined : JSON.stringify(await request.json()), cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const message = response.status === 401 ? "로그인이 만료됐어요. 다시 로그인해 주세요." : response.status === 404 ? "코스가 없거나 수정 권한이 없어요." : response.status === 400 ? "코스 이름과 경로를 확인해 주세요. 거리는 1m~100km여야 합니다." : "저장하지 못했어요. 목록에서 저장 여부를 확인한 후 다시 시도해 주세요.";
      return NextResponse.json({ message }, { status: response.status });
    }
    return response.status === 204 ? new NextResponse(null, { status: 204 }) : NextResponse.json(await response.json(), { status: response.status });
  } catch { return NextResponse.json({ message: "서버 연결을 확인해 주세요. 목록에서 저장 여부를 확인한 후 다시 시도해 주세요." }, { status: 502 }); }
}
