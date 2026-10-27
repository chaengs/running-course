import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { SITE_URL } from "@/lib/seo";
import type { CourseListResponse } from "@/lib/courses";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Read public data at request time; production builds do not require a live backend.
  await connection();
  const entries: MetadataRoute.Sitemap = [{ url: SITE_URL }];
  const ids = new Set<number>();
  for (let page = 0; page < 500; page += 1) {
    const url = new URL("/api/courses/feed", process.env.BACKEND_URL ?? "http://localhost:8080");
    url.searchParams.set("page", String(page));
    url.searchParams.set("size", "100");
    // No session headers: only published courses can enter the sitemap.
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`Sitemap course request failed (${response.status})`);
    const result: CourseListResponse = await response.json();
    for (const course of result.content) ids.add(course.id);
    if (ids.size >= 50_000) throw new Error("Split the sitemap before exceeding 50,000 URLs");
    if (!result.hasNext) {
      for (const id of ids) entries.push({ url: `${SITE_URL}/courses/${id}` });
      return entries;
    }
  }
  throw new Error("Sitemap pagination exceeded its limit");
}
