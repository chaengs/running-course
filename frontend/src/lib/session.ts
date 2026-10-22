import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";

export const SESSION_COOKIE = "running_course_session";
export type CurrentUser = { id: number; email: string; displayName: string };
export async function sessionHeaders(): Promise<Record<string, string>> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const headers = await sessionHeaders();
  if (!headers.Authorization) return null;
  const response = await fetch(new URL("/api/auth/me", process.env.BACKEND_URL ?? "http://localhost:8080"), {
    headers, cache: "no-store", signal: AbortSignal.timeout(5000),
  });
  if (response.status === 401) return null;
  if (!response.ok) throw new Error("로그인 상태를 확인하지 못했어요.");
  return response.json();
});
