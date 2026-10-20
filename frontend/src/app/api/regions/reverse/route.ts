import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const latitude = request.nextUrl.searchParams.get("latitude");
  const longitude = request.nextUrl.searchParams.get("longitude");
  if (
    latitude === null ||
    longitude === null ||
    !Number.isFinite(Number(latitude)) ||
    !Number.isFinite(Number(longitude))
  ) {
    return NextResponse.json({}, { status: 400 });
  }

  const backendUrl = new URL(
    "/api/regions/reverse",
    process.env.BACKEND_URL ?? "http://localhost:8080",
  );
  backendUrl.searchParams.set("latitude", latitude);
  backendUrl.searchParams.set("longitude", longitude);
  try {
    const response = await fetch(backendUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return NextResponse.json({}, { status: 502 });
    return NextResponse.json(await response.json(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({}, { status: 502 });
  }
}
