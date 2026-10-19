"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useReducer, useRef, useState } from "react";
import {
  initialRouteEditorState,
  routeEditorReducer,
  routeLength,
  type RoutePoint,
} from "@/lib/route-editor";
import { CourseVisibilityToggle } from "@/components/course-visibility-toggle";
import { CourseElevation } from "@/components/course-elevation";

const EditorMap = dynamic(() => import("./editor-map"), {
  ssr: false,
  loading: () => (
    <div className="editor-map map-placeholder">
      편집 지도를 불러오고 있어요…
    </div>
  ),
});

type EditableCourse = {
  id: number;
  name: string;
  description: string;
  courseType: string;
  points: RoutePoint[];
  published: boolean;
};
export function CourseEditor({
  initialCourse,
}: {
  initialCourse?: EditableCourse;
}) {
  const [{ points, history, selected }, dispatch] = useReducer(
    routeEditorReducer,
    {
      ...initialRouteEditorState,
      points: initialCourse?.points ?? initialRouteEditorState.points,
    },
  );
  const [name, setName] = useState(initialCourse?.name ?? "");
  const [description, setDescription] = useState(
    initialCourse?.description ?? "",
  );
  const [courseType, setCourseType] = useState(
    initialCourse?.courseType ?? "LOOP",
  );
  const [published, setPublished] = useState(initialCourse?.published ?? false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saved, setSaved] = useState<{
    id: number;
    distanceMeters: number;
  } | null>(null);
  const closed =
    points.length > 2 &&
    points[0].lat === points.at(-1)?.lat &&
    points[0].lng === points.at(-1)?.lng;
  const length = useMemo(() => routeLength(points), [points]);
  const geojson = useMemo(
    () => ({
      type: "LineString",
      coordinates: points.map(({ lat, lng }) => [lng, lat]),
    }),
    [points],
  );

  const updatePoints = useCallback((next: RoutePoint[]) => {
    dispatch({ type: "replace", points: next });
    setMessage("");
  }, []);
  const selectPoint = useCallback(
    (index: number) => dispatch({ type: "select", index }),
    [],
  );

  async function saveCourse() {
    if (savingRef.current || saved) return;
    if (name.trim().length > 30) {
      setMessage("코스 이름은 30자 이하로 입력해 주세요.");
      return;
    }
    const distinctPoints = new Set(
      points.map((point) => `${point.lat},${point.lng}`),
    );
    if (!name.trim() || distinctPoints.size < 3 || !closed || length < 1) {
      setMessage(
        "코스 이름을 입력하고, 서로 다른 경로점 3개 이상을 찍은 뒤 출발점으로 연결해 주세요.",
      );
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(
        initialCourse ? `/api/courses/${initialCourse.id}` : "/api/courses",
        {
          method: initialCourse ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim(),
            courseType,
            routeGeojson: geojson,
            published,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setSaved(result);
      setMessage(`코스를 ${published ? "공개" : "비공개"}로 저장했어요.`);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "저장하지 못했어요. 연결을 확인해 주세요.",
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      <p className="sample-notice">
        지도에서 점을 찍으면 순서대로 직선으로 연결됩니다. 굽은 길에는 점을 더
        촘촘하게 찍어주세요.
      </p>
      <fieldset
        className="editor-save-fields"
        disabled={saving || saved !== null}
      >
        <div className="editor-grid">
          <section aria-label="코스 경로 편집">
            <div className="editor-toolbar">
              <button
                type="button"
                disabled={!history.length}
                onClick={() => {
                  dispatch({ type: "undo" });
                  setMessage("");
                }}
              >
                되돌리기
              </button>
              <button
                type="button"
                disabled={selected === null}
                onClick={() =>
                  updatePoints(points.filter((_, index) => index !== selected))
                }
              >
                선택한 점 삭제
              </button>
              <button
                type="button"
                disabled={points.length < 3 || closed}
                onClick={() => updatePoints([...points, { ...points[0] }])}
              >
                출발점으로 연결
              </button>
              <button
                type="button"
                disabled={!points.length}
                onClick={() => updatePoints([])}
              >
                전체 지우기
              </button>
            </div>
            <EditorMap
              points={points}
              selected={selected}
              onChange={updatePoints}
              onSelect={selectPoint}
              closed={closed}
            />
            <p className="map-caption">
              점 클릭: 선택 · 점 드래그: 위치 수정 · 지도 확대/축소 후 세밀하게
              편집하세요.
            </p>
            <CourseElevation route={geojson} length={length} />
          </section>
          <section
            className="course-info editor-fields"
            aria-labelledby="editor-info-title"
          >
            <header className="editor-info-heading">
              <h2 id="editor-info-title">
                <svg
                  aria-hidden="true"
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <path d="M14 17.5h7M17.5 14v7" />
                </svg>
                코스 정보 입력
              </h2>
            </header>
            <label>
              <span className="editor-field-heading">
                <span>
                  코스 이름 <span className="editor-required">(필수)</span>
                </span>
                <span className="editor-field-hint">최대 30자</span>
              </span>
              <input
                value={name}
                required
                maxLength={30}
                onChange={(event) => setName(event.target.value)}
                placeholder="예: 백운호수 한 바퀴"
              />
            </label>
            <fieldset
              className="editor-course-type"
              aria-describedby="editor-type-help"
            >
              <legend>코스 유형</legend>
              <div className="editor-type-options">
                <label>
                  <input
                    type="radio"
                    name="courseType"
                    value="LOOP"
                    checked={courseType === "LOOP"}
                    onChange={(event) => setCourseType(event.target.value)}
                  />
                  <span>순환형(루프)</span>
                </label>
                <label>
                  <input
                    type="radio"
                    name="courseType"
                    value="OUT_AND_BACK"
                    checked={courseType === "OUT_AND_BACK"}
                    onChange={(event) => setCourseType(event.target.value)}
                  />
                  <span>왕복형</span>
                </label>
              </div>
            </fieldset>
            <label>
              <span className="editor-field-heading editor-description-heading">
                <span>코스 소개 및 주의구간 안내</span>
                <span className="editor-field-hint">선택 사항</span>
              </span>
              <textarea
                value={description}
                maxLength={5000}
                rows={5}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="출발 위치, 식수대와 화장실, 야간 조명 상태, 자전거와 만나는 구간 등을 알려주세요."
              />
            </label>
            <CourseVisibilityToggle
              published={published}
              onChange={setPublished}
              disabled={saving || saved !== null}
            />
            {published && (
              <p className="map-caption">
                공개하기 전에 집 등 개인 위치가 경로에 포함됐는지 확인하세요.
              </p>
            )}
            <button
              className="button-primary"
              type="button"
              onClick={saveCourse}
            >
              {saving
                ? "저장 중…"
                : saved
                  ? "저장 완료"
                  : initialCourse
                    ? "수정 저장"
                    : "코스 저장 및 등록"}
            </button>
            <p className="map-caption">저장 후에도 내용을 수정할 수 있어요.</p>
            <p role="status" className="editor-message">
              {message}
            </p>
          </section>
        </div>
      </fieldset>
      {saved && (
        <p role="status">
          저장 거리: {(saved.distanceMeters / 1000).toFixed(2)}km ·{" "}
          <Link className="back-link" href={`/courses/${saved.id}`}>
            저장한 코스 상세 보기 →
          </Link>
        </p>
      )}
    </>
  );
}
