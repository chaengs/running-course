import type { CourseType } from "./courses";

export const courseTypeLabels: Record<CourseType, string> = { LOOP: "순환형", OUT_AND_BACK: "왕복형" };

export function formatDistance(meters: number) {
  return new Intl.NumberFormat("ko-KR", { maximumFractionDigits: 2 }).format(meters / 1000);
}

export function courseDisplayName(name: string) {
  return name.replace(/^\[개발용\]\s*/, "");
}
