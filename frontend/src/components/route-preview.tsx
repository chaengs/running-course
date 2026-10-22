"use client";
import previewStyles from "@/components/route-preview.module.css";
import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
const PreviewMap = dynamic(() => import("./route-preview-map"), {
    ssr: false,
    loading: () => <div className={previewStyles.previewPlaceholder}>지도를 준비하고 있어요…</div>,
});
export function RoutePreview({ courseId, name, className = "" }: {
    courseId: number;
    name: string;
    className?: string;
}) {
    const container = useRef<HTMLDivElement>(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        if (!container.current)
            return;
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setVisible(true);
                observer.disconnect();
            }
        }, { rootMargin: "160px" });
        observer.observe(container.current);
        return () => observer.disconnect();
    }, []);
    return <div ref={container} className={previewStyles.routePreview + " " + className}>
    {visible ? <PreviewMap courseId={courseId} name={name}/> : <div className={previewStyles.previewPlaceholder}>경로 미리보기</div>}
  </div>;
}
