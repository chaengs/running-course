import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== request.nextUrl.origin) return NextResponse.json({ message: "허용되지 않은 요청입니다." }, { status: 403 });
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ message: "경로 데이터를 확인해 주세요." }, { status: 400 }); }
  try {
    const response = await fetch(new URL("/api/my/elevation", process.env.BACKEND_URL ?? "http://localhost:8080"), {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(40000),
    });
    if (!response.ok) {
      const message = response.status === 401 ? "로그인이 만료됐어요. 다시 로그인해 주세요." : response.status === 400 ? "경로를 확인해 주세요. 고도는 1m~100km 경로에서 계산할 수 있어요." : response.status === 429 ? "고도 조회가 많아요. 잠시 후 다시 시도해 주세요." : response.status === 422 ? "이 경로 일부에는 고도 데이터가 없어요." : "고도 서비스에 연결하지 못했어요. 다시 시도해 주세요.";
      return NextResponse.json({ message }, { status: response.status });
    }
    return NextResponse.json(await response.json(), { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ message: "고도 계산 시간이 초과됐어요. 잠시 후 다시 시도해 주세요." }, { status: 502 }); }
}
