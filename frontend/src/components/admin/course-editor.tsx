"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const EditorMap = dynamic(() => import("./editor-map"), { ssr: false, loading: () => <div className="editor-map map-placeholder">편집 지도를 불러오고 있어요…</div> });
export type RoutePoint = { lat: number; lng: number };

// 클릭한 선분의 지표면 길이입니다. 실제 보행 거리 검증은 하지 않습니다.
function routeLength(points: RoutePoint[]) {
  const rad = Math.PI / 180;
  return points.slice(1).reduce((sum, point, index) => {
    const previous = points[index];
    const a = Math.sin((point.lat - previous.lat) * rad / 2) ** 2 +
      Math.cos(previous.lat * rad) * Math.cos(point.lat * rad) * Math.sin((point.lng - previous.lng) * rad / 2) ** 2;
    return sum + 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  }, 0);
}

export function CourseEditor() {
  const [points, setPoints] = useState<RoutePoint[]>([]);
  const [history, setHistory] = useState<RoutePoint[][]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [courseType, setCourseType] = useState("LOOP");
  const [message, setMessage] = useState("");
  const closed = points.length > 2 && points[0].lat === points.at(-1)?.lat && points[0].lng === points.at(-1)?.lng;
  const length = routeLength(points);
  const geojson = { type: "LineString", coordinates: points.map(({ lat, lng }) => [lng, lat]) };

  function updatePoints(next: RoutePoint[]) {
    setHistory((current) => [...current.slice(-49), points]);
    setPoints(next);
    setSelected(null);
    setMessage("");
  }

  function exportDraft() {
    const distinctPoints = new Set(points.map((point) => `${point.lat},${point.lng}`));
    if (!name.trim() || distinctPoints.size < 3 || !closed || length < 1) {
      setMessage("코스 이름을 입력하고, 서로 다른 경로점 3개 이상을 찍은 뒤 출발점으로 연결해 주세요.");
      return;
    }
    const draft = { name: name.trim(), description: description.trim(), courseType, routeGeojson: geojson, source: "MANUAL_OSM", attribution: "© OpenStreetMap contributors", license: "https://www.openstreetmap.org/copyright" };
    const url = URL.createObjectURL(new Blob([JSON.stringify(draft, null, 2)], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "running-course-draft.json";
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("초안 파일을 내보냈어요. 서버 저장 기능은 다음 단계에서 연결합니다.");
  }

  return <>
    <p className="sample-notice">지도에서 점을 찍으면 순서대로 직선으로 연결됩니다. 굽은 길에는 점을 더 촘촘하게 찍어주세요. 실제 보행 가능 여부는 직접 확인해야 합니다.</p>
    <div className="editor-grid">
      <section aria-label="코스 경로 편집">
        <div className="editor-toolbar">
          <button type="button" disabled={!history.length} onClick={() => { setPoints(history.at(-1)!); setHistory(history.slice(0, -1)); setSelected(null); }}>되돌리기</button>
          <button type="button" disabled={selected === null} onClick={() => updatePoints(points.filter((_, index) => index !== selected))}>선택한 점 삭제</button>
          <button type="button" disabled={points.length < 3 || closed} onClick={() => updatePoints([...points, { ...points[0] }])}>출발점으로 연결</button>
          <button type="button" disabled={!points.length} onClick={() => updatePoints([])}>전체 지우기</button>
        </div>
        <EditorMap points={points} selected={selected} onChange={updatePoints} onSelect={setSelected} closed={closed} />
        <p className="map-caption">점 클릭: 선택 · 점 드래그: 위치 수정 · 지도 확대/축소 후 세밀하게 편집하세요.</p>
        <p className="editor-summary" aria-live="polite">경로점 {points.length}개 · 예상 거리 <strong>{(length / 1000).toFixed(2)}km</strong> · {closed ? "출발점 연결 완료" : "경로 작성 중"}</p>
        <details className="editor-json"><summary>GeoJSON 미리보기</summary><pre>{JSON.stringify(geojson, null, 2)}</pre></details>
      </section>
      <section className="course-info editor-fields" aria-labelledby="editor-info-title">
        <h2 id="editor-info-title">코스 정보</h2>
        <label>코스 이름<input value={name} maxLength={100} onChange={(event) => setName(event.target.value)} placeholder="예: 백운호수 한 바퀴" /></label>
        <label>코스 유형<select value={courseType} onChange={(event) => setCourseType(event.target.value)}><option value="LOOP">순환형</option><option value="OUT_AND_BACK">왕복형</option></select></label>
        <label>코스 소개<textarea value={description} maxLength={5000} rows={6} onChange={(event) => setDescription(event.target.value)} placeholder="길 상태, 주의 구간, 출발 위치를 적어주세요." /></label>
        <p className="map-caption">왕복형은 반환점까지 그린 후 같은 길을 따라 출발점으로 돌아오는 경로도 입력하세요.</p>
        <button className="button-primary" type="button" onClick={exportDraft}>초안 JSON 내보내기</button>
        <p className="map-caption">현재는 화면에서 작성하고 파일로 내보낼 수 있습니다. DB 저장·게시와 관리자 인증은 아직 연결되지 않았어요. 페이지를 떠나면 작성 내용이 사라집니다.</p>
        <p role="status" className="editor-message">{message}</p>
      </section>
    </div>
  </>;
}
