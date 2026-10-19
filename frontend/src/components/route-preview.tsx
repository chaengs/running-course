"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const PreviewMap = dynamic(() => import("./route-preview-map"), {
  ssr: false,
  loading: () => <div className="preview-placeholder">지도를 준비하고 있어요…</div>,
});

export function RoutePreview({ courseId, name }: { courseId: number; name: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!container.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setVisible(true);
        observer.disconnect();
      }
    }, { rootMargin: "160px" });
    observer.observe(container.current);
    return () => observer.disconnect();
  }, []);

  return <div ref={container} className="route-preview">
    {visible ? <PreviewMap courseId={courseId} name={name} /> : <div className="preview-placeholder">경로 미리보기</div>}
  </div>;
}
