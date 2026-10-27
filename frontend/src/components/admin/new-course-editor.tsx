"use client";

import { useLayoutEffect, useState } from "react";
import { flushSync } from "react-dom";
import { CourseEditor } from "./course-editor";

export function NewCourseEditor() {
  const [session, setSession] = useState(0);

  useLayoutEffect(() => {
    // Clear drafts before a full-document navigation can preserve them in bfcache.
    const discardOnPageHide = () => {
      flushSync(() => setSession((current) => current + 1));
    };
    window.addEventListener("pagehide", discardOnPageHide);
    return () => {
      window.removeEventListener("pagehide", discardOnPageHide);
      // Next.js Activity also runs this cleanup when the route becomes hidden.
      // Remount the whole editor, including search, map, form and elevation state.
      setSession((current) => current + 1);
    };
  }, []);

  return <CourseEditor key={session} />;
}
