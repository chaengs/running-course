import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

type Context = { params: Promise<{ courseId: string }> };

async function mutate(request: NextRequest, { params }: Context) {
  if (request.headers.get("origin") !== request.nextUrl.origin)
    return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  const { courseId } = await params;
  if (!/^[1-9]\d{0,18}$/.test(courseId) || BigInt(courseId) > BigInt("9223372036854775807"))
    return NextResponse.json({ message: "코스를 찾을 수 없어요." }, { status: 404 });
  try {
    const response = await fetch(new URL(`/api/my/bookmarks/${courseId}`, process.env.BACKEND_URL ?? "http://localhost:8080"), {
      method: request.method, headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const message = response.status === 401 ? "로그인이 만료됐어요. 다시 로그인해 주세요." : response.status === 404 ? "삭제되었거나 비공개인 코스예요." : "찜 상태를 변경하지 못했어요. 다시 시도해 주세요.";
      return NextResponse.json({ message }, { status: response.status });
    }
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ message: "서버 연결을 확인하고 다시 시도해 주세요." }, { status: 502 });
  }
}

export const PUT = mutate;
export const DELETE = mutate;
