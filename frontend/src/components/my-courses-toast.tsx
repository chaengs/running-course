"use client";

import { useEffect, useState } from "react";
import toastStyles from "@/components/my-courses-toast.module.css";

export function MyCoursesToast() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const showToast = (event: Event) => {
      const nextMessage = (event as CustomEvent<string>).detail;
      if (typeof nextMessage !== "string" || !nextMessage) return;
      setMessage(nextMessage);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => setMessage(""), 1000);
    };
    window.addEventListener("running-course:toast", showToast);
    return () => {
      window.removeEventListener("running-course:toast", showToast);
      if (timeout) clearTimeout(timeout);
    };
  }, []);

  if (!message) return null;
  return <div className={toastStyles.toast} role="status" aria-live="polite">{message}</div>;
}
