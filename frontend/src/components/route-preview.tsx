"use client";
import previewStyles from "@/components/route-preview.module.css";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
const PreviewMap = dynamic(() => import("./route-preview-map"), {
    ssr: false,
    loading: () => <div className={previewStyles.previewPlaceholder}>지도를 준비하고 있어요…</div>,
});
export function RoutePreview({ courseId, name, className = "", eager = false }: {
    courseId: number;
    name: string;
    className?: string;
    eager?: boolean;
}) {
    const container = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(eager);
    useEffect(() => {
        if (eager) return;
        const element = container.current;
        if (!element) return;
        const observer = "IntersectionObserver" in window
            ? new IntersectionObserver(([entry]) => {
                  if (entry.isIntersecting) {
                      setVisible(true);
                      observer?.disconnect();
                  }
              }, { rootMargin: "160px" })
            : null;
        observer?.observe(element);
        const frame = window.requestAnimationFrame(() => {
            const rect = element.getBoundingClientRect();
            const nearViewport = rect.top < window.innerHeight + 160 && rect.bottom > -160;
            if (nearViewport || !observer) {
                setVisible(true);
                observer?.disconnect();
            }
        });
        return () => {
            window.cancelAnimationFrame(frame);
            observer?.disconnect();
        };
    }, [eager]);
    return <div ref={container} className={previewStyles.routePreview + " " + className}>
    {visible ? <PreviewMap courseId={courseId} name={name}/> : <div className={previewStyles.previewPlaceholder}>경로 미리보기</div>}
  </div>;
}
