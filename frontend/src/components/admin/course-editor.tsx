"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useMemo, useReducer, useRef, useState } from "react";
import { initialRouteEditorState, routeEditorReducer, routeLength, type RoutePoint } from "@/lib/route-editor";
import { CourseVisibilityToggle } from "@/components/course-visibility-toggle";

const EditorMap = dynamic(() => import("./editor-map"), { ssr: false, loading: () => <div className="editor-map map-placeholder">편집 지도를 불러오고 있어요…</div> });

type EditableCourse = { id: number; name: string; description: string; courseType: string; points: RoutePoint[]; published: boolean };
export function CourseEditor({ initialCourse }: { initialCourse?: EditableCourse }) {
  const [{ points, history, selected }, dispatch] = useReducer(routeEditorReducer, { ...initialRouteEditorState, points: initialCourse?.points ?? initialRouteEditorState.points });
  const [name, setName] = useState(initialCourse?.name ?? "");
  const [description, setDescription] = useState(initialCourse?.description ?? "");
  const [courseType, setCourseType] = useState(initialCourse?.courseType ?? "LOOP");
  const [published, setPublished] = useState(initialCourse?.published ?? false);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [saved, setSaved] = useState<{ id: number; distanceMeters: number } | null>(null);
  const closed = points.length > 2 && points[0].lat === points.at(-1)?.lat && points[0].lng === points.at(-1)?.lng;
  const length = useMemo(() => routeLength(points), [points]);
  const geojson = useMemo(() => ({ type: "LineString", coordinates: points.map(({ lat, lng }) => [lng, lat]) }), [points]);
  const geojsonPreview = useMemo(() => JSON.stringify(geojson, null, 2), [geojson]);

  const updatePoints = useCallback((next: RoutePoint[]) => {
    dispatch({ type: "replace", points: next });
    setMessage("");
  }, []);
  const selectPoint = useCallback((index: number) => dispatch({ type: "select", index }), []);

  async function saveCourse() {
    if (savingRef.current || saved) return;
    const distinctPoints = new Set(points.map((point) => `${point.lat},${point.lng}`));
    if (!name.trim() || distinctPoints.size < 3 || !closed || length < 1) {
      setMessage("코스 이름을 입력하고, 서로 다른 경로점 3개 이상을 찍은 뒤 출발점으로 연결해 주세요.");
      return;
    }
    savingRef.current = true;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(initialCourse ? `/api/courses/${initialCourse.id}` : "/api/courses", {
        method: initialCourse ? "PUT" : "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), description: description.trim(), courseType, routeGeojson: geojson, published }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      setSaved(result);
      setMessage(`코스를 ${published ? "공개" : "비공개"}로 저장했어요.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장하지 못했어요. 연결을 확인해 주세요.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  return <>
    <p className="sample-notice">지도에서 점을 찍으면 순서대로 직선으로 연결됩니다. 굽은 길에는 점을 더 촘촘하게 찍어주세요. 실제 보행 가능 여부는 직접 확인해야 합니다.</p>
    <fieldset className="editor-save-fields" disabled={saving || saved !== null}>
    <div className="editor-grid">
      <section aria-label="코스 경로 편집">
        <div className="editor-toolbar">
          <button type="button" disabled={!history.length} onClick={() => { dispatch({ type: "undo" }); setMessage(""); }}>되돌리기</button>
          <button type="button" disabled={selected === null} onClick={() => updatePoints(points.filter((_, index) => index !== selected))}>선택한 점 삭제</button>
          <button type="button" disabled={points.length < 3 || closed} onClick={() => updatePoints([...points, { ...points[0] }])}>출발점으로 연결</button>
          <button type="button" disabled={!points.length} onClick={() => updatePoints([])}>전체 지우기</button>
        </div>
        <EditorMap points={points} selected={selected} onChange={updatePoints} onSelect={selectPoint} closed={closed} />
        <p className="map-caption">점 클릭: 선택 · 점 드래그: 위치 수정 · 지도 확대/축소 후 세밀하게 편집하세요.</p>
        <p className="editor-summary" aria-live="polite">경로점 {points.length}개 · 예상 거리 <strong>{(length / 1000).toFixed(2)}km</strong> · {closed ? "출발점 연결 완료" : "경로 작성 중"}</p>
        <details className="editor-json"><summary>GeoJSON 미리보기</summary><pre>{geojsonPreview}</pre></details>
      </section>
      <section className="course-info editor-fields" aria-labelledby="editor-info-title">
        <h2 id="editor-info-title">코스 정보</h2>
        <label>코스 이름<input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="예: 백운호수 한 바퀴" /></label>
        <label>코스 유형<select value={courseType} onChange={(event) => setCourseType(event.target.value)}><option value="LOOP">순환형</option><option value="OUT_AND_BACK">왕복형</option></select></label>
        <label>코스 소개<textarea value={description} maxLength={5000} rows={6} onChange={(event) => setDescription(event.target.value)} placeholder="길 상태, 주의 구간, 출발 위치를 적어주세요." /></label>
        <p className="map-caption">왕복형은 반환점까지 그린 후 같은 길을 따라 출발점으로 돌아오는 경로도 입력하세요.</p>
        <CourseVisibilityToggle published={published} onChange={setPublished} disabled={saving || saved !== null} />
        {published && <p className="map-caption">공개하기 전에 집 등 개인 위치가 경로에 포함됐는지 확인하세요.</p>}
        <button className="button-primary" type="button" onClick={saveCourse}>{saving ? "저장 중…" : saved ? "저장 완료" : initialCourse ? "수정 저장" : "코스 저장"}</button>
        <p className="map-caption">선택한 공개 범위를 코스와 함께 저장합니다. 최종 거리는 서버에서 계산합니다.</p>
        <p role="status" className="editor-message">{message}</p>
      </section>
    </div>
    </fieldset>
    {saved && <p role="status">저장 거리: {(saved.distanceMeters / 1000).toFixed(2)}km · <Link className="back-link" href={`/courses/${saved.id}`}>저장한 코스 상세 보기 →</Link></p>}
  </>;
}
