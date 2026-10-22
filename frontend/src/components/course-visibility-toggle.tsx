"use client";
import visibilityStyles from "@/components/course-visibility-toggle.module.css";
import { useId } from "react";
export function CourseVisibilityToggle({ published, onChange, disabled = false, }: {
    published: boolean;
    onChange: (published: boolean) => void;
    disabled?: boolean;
}) {
    const descriptionId = useId();
    return (<div className={visibilityStyles.visibilityControl}>
      <label className={visibilityStyles.visibilityToggle}>
        <span className={visibilityStyles.visibilityCopy}>
          <span>전체 공개</span>
          <span id={descriptionId} className={visibilityStyles.visibilityDescription}>
            {published
            ? "다른 러너가 코스를 볼 수 있어요."
            : "코스를 나만 볼 수 있어요."}
          </span>
        </span>
        <input type="checkbox" role="switch" checked={published} disabled={disabled} aria-label="전체 공개" aria-describedby={descriptionId} onChange={(event) => onChange(event.target.checked)}/>
        <span className={visibilityStyles.visibilityTrack} aria-hidden="true">
          <span />
        </span>
      </label>
    </div>);
}
