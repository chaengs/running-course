import { NextResponse } from "next/server";

export async function GET() {
  try {
    const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8080";
    const response = await fetch(new URL("/api/health", backendUrl), {
      cache: "no-store",
      signal: AbortSignal.timeout(7_000),
    });
    const body = await response.json().catch(() => null);

    if (!response.ok || body?.status !== "UP") {
      return NextResponse.json({ status: "DOWN" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ status: "UP" }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ status: "DOWN" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
