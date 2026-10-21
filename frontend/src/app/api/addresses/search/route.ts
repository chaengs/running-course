import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

export async function GET(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) {
    return NextResponse.json({ message: "로그인이 필요합니다." }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("query")?.trim();
  if (!query || query.length < 2 || query.length > 100) {
    return NextResponse.json({ message: "주소를 2자 이상 입력해 주세요." }, { status: 400 });
  }

  const backendUrl = new URL(
    "/api/my/addresses/search",
    process.env.BACKEND_URL ?? "http://localhost:8080",
  );
  backendUrl.searchParams.set("query", query);

  try {
    const response = await fetch(backendUrl, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = response.status === 429
        ? "주소 검색 요청이 많아요. 잠시 후 다시 시도해 주세요."
        : response.status === 503
          ? "주소 검색을 사용할 수 없어요. 서버 설정을 확인해 주세요."
          : response.status === 502
            ? "주소 검색 서비스에 연결하지 못했어요. 잠시 후 다시 시도해 주세요."
            : body.detail ?? body.message ?? "주소를 검색하지 못했어요.";
      return NextResponse.json({ message }, { status: response.status });
    }
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(
      { message: "주소 검색 시간이 초과됐어요. 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
