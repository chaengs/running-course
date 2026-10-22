import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const { action } = await params;
  if (!["register", "login", "logout"].includes(action)) return NextResponse.json({}, { status: 404 });
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const response = await fetch(new URL(`/api/auth/${action}`, process.env.BACKEND_URL ?? "http://localhost:8080"), {
      method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: action === "logout" ? undefined : JSON.stringify(await request.json()),
      cache: "no-store", signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      const message = response.status === 409 ? "이미 가입된 이메일입니다." : response.status === 401 ? "이메일 또는 비밀번호를 확인해 주세요." : response.status === 400 ? "이메일·닉네임·비밀번호 형식을 확인해 주세요." : "잠시 후 다시 시도해 주세요.";
      return NextResponse.json({ message }, { status: response.status });
    }
    const result = action === "logout" ? null : await response.json();
    const outgoing = NextResponse.json({ user: result?.user ?? null });
    outgoing.headers.set("Cache-Control", "no-store");
    outgoing.cookies.set(SESSION_COOKIE, result?.token ?? "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: result ? 60 * 60 * 24 * 7 : 0 });
    return outgoing;
  } catch { return NextResponse.json({ message: "인증 서버에 연결할 수 없어요." }, { status: 502 }); }
}
