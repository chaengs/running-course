import { NextRequest, NextResponse } from "next/server";
import { proxyCourseMutation } from "@/lib/course-proxy";
async function mutation(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  if (!/^[1-9]\d*$/.test(path[0] ?? "") || path.length > 2 || (path.length === 2 && path[1] !== "visibility") ||
      (request.method === "PATCH") !== (path.length === 2)) return NextResponse.json({}, { status: 404 });
  return proxyCourseMutation(request, `/${path.join("/")}`);
}
export const PUT = mutation;
export const PATCH = mutation;
export const DELETE = mutation;
