"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  getCourseCollectionRevision,
  subscribeToCourseCollections,
} from "@/lib/course-collection-events";

export function CourseCollectionRefresh() {
  const router = useRouter();
  const observedRevision = useRef(0);

  useEffect(() => {
    const refreshIfChanged = () => {
      const nextRevision = getCourseCollectionRevision();
      if (nextRevision === observedRevision.current) return;
      observedRevision.current = nextRevision;
      router.refresh();
    };
    const unsubscribe = subscribeToCourseCollections(refreshIfChanged);
    // Activity stops Effects while hidden. Check missed mutations on reactivation.
    refreshIfChanged();
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) router.refresh();
    };
    window.addEventListener("pageshow", onPageShow);
    return () => {
      unsubscribe();
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [router]);

  return null;
}
