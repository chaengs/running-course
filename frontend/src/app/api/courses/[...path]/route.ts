import { NextRequest, NextResponse } from "next/server";
import { proxyCourseMutation } from "@/lib/course-proxy";
import { SESSION_COOKIE } from "@/lib/session";
async function mutation(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const isBulkVisibility = path.length === 1 && path[0] === "visibility" && request.method === "PATCH";
  const isCourseMutation = /^[1-9]\d*$/.test(path[0] ?? "") && path.length <= 2 &&
    (path.length === 1 || path[1] === "visibility") &&
    ((request.method === "PATCH") === (path.length === 2));
  if (!isBulkVisibility && !isCourseMutation) return NextResponse.json({}, { status: 404 });
  return proxyCourseMutation(request, `/${path.join("/")}`);
}
export const PUT = mutation;
export const PATCH = mutation;
export const DELETE = mutation;

// Only public route geometry is exposed to card previews. Keep private course data server-side.
export async function GET(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (path.length !== 2 || path[1] !== "preview" || !/^[1-9]\d{0,18}$/.test(path[0]) || BigInt(path[0]) > BigInt("9223372036854775807")) {
    return NextResponse.json({}, { status: 404 });
  }
  try {
    const token = request.cookies.get(SESSION_COOKIE)?.value;
    const response = await fetch(new URL(`/api/courses/${path[0]}`, process.env.BACKEND_URL ?? "http://localhost:8080"), {
      headers: token
        ? { Authorization: `Bearer ${token}` }
        : undefined,
      cache: "no-store", signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return NextResponse.json({}, { status: response.status === 404 ? 404 : 502 });
    const course = await response.json();
    return NextResponse.json(course.routeGeojson, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({}, { status: 502 });
  }
}
