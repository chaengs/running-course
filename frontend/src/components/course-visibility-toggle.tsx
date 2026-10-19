"use client";

import { useId } from "react";

export function CourseVisibilityToggle({ published, onChange, disabled = false }: {
  published: boolean; onChange: (published: boolean) => void; disabled?: boolean;
}) {
  const descriptionId = useId();
  return <div className="visibility-control">
    <label className="visibility-toggle">
      <span>비공개로 저장</span>
      <input type="checkbox" role="switch" checked={!published} disabled={disabled}
        aria-describedby={descriptionId} onChange={(event) => onChange(!event.target.checked)} />
      <span className="visibility-track" aria-hidden="true"><span /></span>
    </label>
    <p id={descriptionId} className="map-caption">{published ? "공개 · 누구나 코스를 검색하고 공유 URL로 볼 수 있어요." : "비공개 · 나만 볼 수 있어요."}</p>
  </div>;
}
