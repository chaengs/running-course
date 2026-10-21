"use client";

import dynamic from "next/dynamic";
import { useCallback, useMemo, useRef, useState } from "react";
import mapStyles from "@/components/admin/editor-map.module.css";
import editorStyles from "@/components/admin/course-editor.module.css";
import uiStyles from "@/styles/ui.module.css";
import formStyles from "@/components/form.module.css";
import { EditorToolIcon } from "@/components/admin/editor-tool-icon";
import { CourseElevation, type CourseElevationProfile } from "@/components/course-elevation";
import { routeLength, type RoutePoint } from "@/lib/route-editor";
import type { WalkingRoutePoint } from "@/lib/kakao-walking";
import styles from "./kakao-walking-tester.module.css";

const EditorMap = dynamic(() => import("@/components/admin/editor-map"), {
  ssr: false,
  loading: () => <div className={`${mapStyles.editorMap} ${uiStyles.mapPlaceholder}`} role="status">편집 지도를 불러오고 있어요…</div>,
});

type RouteMode = "SHORTEST" | "BROAD_FIRST" | "ACCESSIBLE";
type Segment = {
  distanceMeters: number;
  durationSeconds: number;
  points: RoutePoint[];
  landingUrl?: string | null;
  joinAdjustmentMeters: number;
};

function samePoint(a: RoutePoint, b: RoutePoint) {
  return a.lat === b.lat && a.lng === b.lng;
}

function distanceMeters(a: RoutePoint, b: RoutePoint) {
  const radians = (value: number) => value * Math.PI / 180;
  const latitudeDelta = radians(b.lat - a.lat);
  const longitudeDelta = radians(b.lng - a.lng);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function routeGeometry(segments: Segment[]) {
  const points: RoutePoint[] = [];
  for (const segment of segments) {
    const segmentPoints = points.length > 0 ? segment.points.slice(1) : segment.points;
    for (const point of segmentPoints) {
      if (!points.length || !samePoint(points.at(-1)!, point)) points.push(point);
    }
  }
  return points;
}

export function KakaoWalkingTester() {
  const [anchors, setAnchors] = useState<RoutePoint[]>([]);
  const anchorsRef = useRef<RoutePoint[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const segmentsRef = useRef<Segment[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [routeMode, setRouteMode] = useState<RouteMode>("SHORTEST");
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const [message, setMessage] = useState("");
  const [elevationProfile, setElevationProfile] = useState<CourseElevationProfile | null>(null);
  const displayRoute = useMemo(() => routeGeometry(segments), [segments]);
  const routeGeojson = useMemo(() => ({
    type: "LineString",
    coordinates: displayRoute.map(({ lat, lng }) => [lng, lat]),
  }), [displayRoute]);
  const length = useMemo(() => routeLength(displayRoute), [displayRoute]);
  const closed = anchors.length > 2 && samePoint(anchors[0], anchors.at(-1)!);
  const joined = segments.length === Math.max(0, anchors.length - 1);
  const distance = segments.reduce((total, segment) => total + segment.distanceMeters, 0);
  const duration = segments.reduce((total, segment) => total + segment.durationSeconds, 0);
  const maxJoinAdjustment = segments.reduce((max, segment) => Math.max(max, segment.joinAdjustmentMeters), 0);

  const calculateFrom = useCallback(async (points: RoutePoint[], startSegment: number, previousSegments: Segment[], mode: RouteMode) => {
    if (pendingRef.current || points.length < 2) return;
    const isClosedRoute = points.length > 2 && samePoint(points[0], points.at(-1)!);
    pendingRef.current = true;
    setPending(true);
    setMessage("");
    const nextSegments = previousSegments.slice(0, startSegment);
    segmentsRef.current = nextSegments;
    setSegments(nextSegments);
    try {
      for (let index = startSegment; index < points.length - 1; index += 1) {
        const previousRouteEnd = index > 0 ? nextSegments[index - 1]?.points.at(-1) : undefined;
        const start = previousRouteEnd ?? points[index];
        const response = await fetch("/api/test/kakao-walking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            points: [
              { latitude: start.lat, longitude: start.lng },
              { latitude: points[index + 1].lat, longitude: points[index + 1].lng },
            ],
            routeMode: mode,
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message ?? `${index + 1}번째 구간을 계산하지 못했어요.`);
        const rawPoints = (body.points as WalkingRoutePoint[]).map(({ latitude, longitude }) => ({ lat: latitude, lng: longitude }));
        if (rawPoints.length < 2) throw new Error(`${index + 1}번째 구간에 표시할 경로가 없습니다.`);

        let joinAdjustmentMeters = previousRouteEnd ? distanceMeters(previousRouteEnd, rawPoints[0]) : 0;
        // Kakao may snap both ends to nearby path nodes. Pin each new segment to the preceding Kakao route endpoint.
        if (previousRouteEnd) rawPoints[0] = previousRouteEnd;
        const isClosingSegment = isClosedRoute && index === points.length - 2;
        if (isClosingSegment && nextSegments[0]?.points[0]) {
          const routeStart = nextSegments[0].points[0];
          joinAdjustmentMeters = Math.max(joinAdjustmentMeters, distanceMeters(rawPoints.at(-1)!, routeStart));
          rawPoints[rawPoints.length - 1] = routeStart;
        }

        nextSegments[index] = {
          distanceMeters: body.distanceMeters,
          durationSeconds: body.durationSeconds,
          points: rawPoints,
          landingUrl: body.landingUrl,
          joinAdjustmentMeters,
        };
        segmentsRef.current = [...nextSegments];
        setSegments([...nextSegments]);
      }
      const maxAdjustedJoin = nextSegments.reduce((max, segment) => Math.max(max, segment.joinAdjustmentMeters), 0);
      if (isClosedRoute && maxAdjustedJoin > 5) setMessage(`구간 연결점 최대 ${Math.round(maxAdjustedJoin)}m를 카카오 경로 좌표에 맞춰 자동 조정했어요. 접합부를 지도에서 확인해 주세요.`);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "도보 경로를 계산하지 못했어요.");
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }, []);

  const updateAnchors = useCallback((next: RoutePoint[]) => {
    if (pendingRef.current) return;
    if (next.length > 20) {
      setMessage("API 요청이 많아지지 않도록 테스트 경로는 최대 20개 지점까지 지원해요.");
      return;
    }
    const previous = anchorsRef.current;
    anchorsRef.current = next;
    setAnchors(next);
    setSelected(null);
    setElevationProfile(null);
    setMessage("");

    if (next.length < 2) {
      segmentsRef.current = [];
      setSegments([]);
      return;
    }

    const isAppend = next.length === previous.length + 1
      && previous.every((point, index) => samePoint(point, next[index]));
    let changedIndex = 0;
    while (changedIndex < Math.min(previous.length, next.length) && samePoint(previous[changedIndex], next[changedIndex])) changedIndex += 1;
    const priorSegments = segmentsRef.current;
    const canAppendOnly = isAppend && priorSegments.length === previous.length - 1;
    const changedSegment = isAppend
      ? (canAppendOnly ? previous.length - 1 : 0)
      : Math.max(0, changedIndex - 1);
    const startSegment = Math.min(next.length - 2, Math.min(changedSegment, priorSegments.length));
    void calculateFrom(next, startSegment, priorSegments, routeMode);
  }, [calculateFrom, routeMode]);

  const selectPoint = useCallback((index: number) => setSelected(index), []);
  const routeTools = useMemo(() => {
    function RouteTools({
      locating,
      locationMessage,
      moveToCurrentLocation,
    }: {
      locating: boolean;
      locationMessage: string;
      moveToCurrentLocation: () => void;
    }) {
      return <>
        <button type="button" className={mapStyles.editorToolLocation} title="현재 위치로 지도 이동" onClick={moveToCurrentLocation} disabled={locating} aria-describedby={locationMessage ? "editor-location-status" : undefined}>
          <EditorToolIcon tool="location" /><span>현재 위치로 이동</span>
        </button>
        <button type="button" className={mapStyles.editorToolReset} title="전체 경로 초기화" disabled={!anchors.length} onClick={() => updateAnchors([])}>
          <EditorToolIcon tool="reset" /><span>전체 지우기</span>
        </button>
      </>;
    }
    return RouteTools;
  }, [anchors.length, updateAnchors]);

  function changeRouteMode(mode: RouteMode) {
    setRouteMode(mode);
    setElevationProfile(null);
    if (anchors.length > 1 && !pendingRef.current) void calculateFrom(anchors, 0, [], mode);
  }

  return <div className={editorStyles.editorGrid}>
    <section aria-label="도보 경로 편집 테스트">
      <fieldset className={styles.mapFieldset} disabled={pending}>
        <EditorMap
          points={anchors}
          displayRoute={displayRoute}
          selected={selected}
          onChange={updateAnchors}
          onSelect={selectPoint}
          closed={closed}
          tools={routeTools}
        />
      </fieldset>
      <aside className={editorStyles.mapInstructions} aria-label="지도 그리는 방법">
        <header className={editorStyles.mapInstructionsHeader}>
          <div>
            <h3>지도 그리는 방법</h3>
            <p>코스 만들기 화면과 같은 방식으로 지도에서 경로를 편집해보세요.</p>
          </div>
        </header>
        <ul className={editorStyles.mapInstructionList}>
          <li><span className={editorStyles.mapInstructionIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></span><span className={editorStyles.mapInstructionText}><strong>경로점 추가</strong><span><b>지도 클릭</b><span>직전 점부터 도보 경로 계산</span></span></span></li>
          <li><span className={editorStyles.mapInstructionIcon} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="m5 9-3 3 3 3M9 5l3-3 3 3m0 14-3 3-3-3m10-10 3 3-3 3M2 12h20M12 2v20"/></svg></span><span className={editorStyles.mapInstructionText}><strong>위치 수정</strong><span><b>점 드래그</b><span>연결된 구간 다시 계산</span></span></span></li>
          <li><span className={`${editorStyles.mapInstructionIcon} ${editorStyles.mapInstructionDeleteIcon}`} aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v6m4-6v6"/></svg></span><span className={editorStyles.mapInstructionText}><strong>경로점 삭제</strong><span><b>점 더블클릭</b><span>인접 구간 다시 계산</span></span></span></li>
        </ul>
        <p className={editorStyles.mapInstructionsTip}><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg><span>마지막에 출발점을 클릭해 순환 코스로 닫으면 고도 프로필도 자동 계산합니다.</span></p>
      </aside>
      {pending && <p className={styles.pendingStatus} role="status">카카오 도보 경로를 계산하고 있어요… 완료되면 지도를 다시 편집할 수 있습니다.</p>}
      <CourseElevation
        route={routeGeojson}
        length={pending ? 0 : length}
        initialProfile={null}
        onProfileChange={setElevationProfile}
      />
    </section>
    <section className={`${uiStyles.courseInfo} ${formStyles.editorFields} ${styles.infoPanel}`} aria-labelledby="kakao-test-info-title">
      <header className={editorStyles.editorInfoHeading}><h2 id="kakao-test-info-title">도보 경로 테스트 정보</h2></header>
      <label>
        <span className={editorStyles.editorFieldHeading}><span>경로 기준</span><span className={editorStyles.editorFieldHint}>카카오 API</span></span>
        <select value={routeMode} disabled={pending} onChange={(event) => changeRouteMode(event.target.value as RouteMode)}>
          <option value="SHORTEST">최단 경로</option>
          <option value="BROAD_FIRST">넓은 길 우선</option>
          <option value="ACCESSIBLE">편안한 길</option>
        </select>
      </label>
      <dl className={styles.metrics}>
        <div><dt>지도 경로점</dt><dd>{anchors.length}개</dd></div>
        <div><dt>계산 완료 구간</dt><dd>{segments.length}/{Math.max(0, anchors.length - 1)}개</dd></div>
        <div><dt>경로 계산 상태</dt><dd>{pending ? "계산 중" : joined && anchors.length > 1 ? "완료" : segments.length > 0 ? "일부 완료" : "대기"}</dd></div>
        <div><dt>카카오 안내 거리</dt><dd>{distance >= 1000 ? `${(distance / 1000).toFixed(2)}km` : `${distance}m`}</dd></div>
        <div><dt>예상 보행 시간</dt><dd>{duration ? `${Math.ceil(duration / 60)}분` : "—"}</dd></div>
        <div><dt>고도 샘플 경로 길이</dt><dd>{length ? `${(length / 1000).toFixed(2)}km` : "—"}</dd></div>
        <div><dt>예상 난이도</dt><dd>{elevationProfile ? ({ LOW: "하", MEDIUM: "중", HIGH: "상" }[elevationProfile.difficulty.level]) : "—"}</dd></div>
      </dl>
      {pending && <p className={styles.status} role="status">구간별 보행 경로를 순서대로 요청하고 있어요.</p>}
      {message && <p className={styles.error} role="alert">{message}</p>}
      {maxJoinAdjustment > 0 && <p className={styles.note}>경로점 연결 좌표를 최대 {Math.round(maxJoinAdjustment)}m 자동 조정했습니다. 출발점으로 루프를 닫으면 마지막 끝점도 시작 경로 좌표에 맞춥니다.</p>}
      {segments.at(-1)?.landingUrl && <a className={styles.kakaoLink} href={segments.at(-1)?.landingUrl ?? undefined} target="_blank" rel="noreferrer">마지막 구간 카카오 지도에서 보기</a>}
      <p className={styles.note}>테스트 화면에서 계산한 경로와 고도는 저장되지 않습니다. 실제 코스 편집 화면과 같은 지도 편집 조작을 사용합니다.</p>
    </section>
  </div>;
}
