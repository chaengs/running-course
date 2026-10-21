"use client";
import mapStyles from "@/components/admin/editor-map.module.css";
import uiStyles from "@/styles/ui.module.css";
import editorStyles from "@/components/admin/course-editor.module.css";
import formStyles from "@/components/form.module.css";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useReducer, useRef, useState } from "react";
import {
  initialRouteEditorState,
  routeEditorReducer,
  type RoutePoint,
} from "@/lib/route-editor";
import { CourseVisibilityToggle } from "@/components/course-visibility-toggle";
import {
  CourseElevation,
  type CourseElevationProfile,
} from "@/components/course-elevation";
import { EditorToolIcon } from "./editor-tool-icon";
import type { WalkingRoutePoint } from "@/lib/kakao-walking";

type WalkingSegment = { distanceMeters: number; points: RoutePoint[] };

function samePoint(a: RoutePoint, b: RoutePoint) {
  return a.lat === b.lat && a.lng === b.lng;
}

function joinWalkingSegments(segments: WalkingSegment[]) {
  const points: RoutePoint[] = [];
  for (const segment of segments) {
    for (const point of (points.length ? segment.points.slice(1) : segment.points)) {
      if (!points.length || !samePoint(points.at(-1)!, point)) points.push(point);
    }
  }
  return points;
}
const EditorMap = dynamic(() => import("./editor-map"), {
  ssr: false,
  loading: () => (
    <div className={mapStyles.editorMap + " " + uiStyles.mapPlaceholder}>
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
  routeCoordinates: RoutePoint[];
  distanceMeters: number;
  published: boolean;
  elevationProfile: CourseElevationProfile | null;
};
export function CourseEditor({
  initialCourse,
}: {
  initialCourse?: EditableCourse;
}) {
  const router = useRouter();
  const [{ points, selected }, dispatch] = useReducer(routeEditorReducer, {
    ...initialRouteEditorState,
    points: initialCourse?.points ?? initialRouteEditorState.points,
  });
  const [name, setName] = useState(initialCourse?.name ?? "");
  const [description, setDescription] = useState(
    initialCourse?.description ?? "",
  );
  const [courseType, setCourseType] = useState(
    initialCourse?.courseType ?? "LOOP",
  );
  const [published, setPublished] = useState(initialCourse?.published ?? false);
  const [message, setMessage] = useState("");
  const [walkingSegments, setWalkingSegments] = useState<WalkingSegment[]>([]);
  const [routeDirty, setRouteDirty] = useState(false);
  const walkingSegmentsRef = useRef<WalkingSegment[]>([]);
  const anchorsRef = useRef(points);
  const [routing, setRouting] = useState(false);
  const routingRef = useRef(false);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [elevationProfile, setElevationProfile] =
    useState<CourseElevationProfile | null>(
      initialCourse?.elevationProfile ?? null,
    );
  const closed =
    points.length > 2 &&
    points[0].lat === points.at(-1)?.lat &&
    points[0].lng === points.at(-1)?.lng;
  const walkingRoute = useMemo(
    () => initialCourse && !routeDirty ? initialCourse.routeCoordinates : joinWalkingSegments(walkingSegments),
    [initialCourse, routeDirty, walkingSegments],
  );
  const length = useMemo(
    () => initialCourse && !routeDirty ? initialCourse.distanceMeters : walkingSegments.reduce((sum, segment) => sum + segment.distanceMeters, 0),
    [initialCourse, routeDirty, walkingSegments],
  );
  const canSave =
    name.trim().length > 0 &&
    name.trim().length <= 30 &&
    new Set(points.map(({ lat, lng }) => `${lat},${lng}`)).size >= 3 &&
    closed &&
    ((Boolean(initialCourse) && !routeDirty) || (!routing && walkingSegments.length === points.length - 1 && walkingRoute.length > 1)) &&
    length >= 1 &&
    length <= 100000;
  const geojson = useMemo(
    () => ({
      type: "LineString",
      coordinates: walkingRoute.map(({ lat, lng }) => [lng, lat]),
    }),
    [walkingRoute],
  );
  const calculateWalkingRoute = useCallback(async (next: RoutePoint[], fromSegment: number) => {
    if (next.length < 2) {
      walkingSegmentsRef.current = [];
      setWalkingSegments([]);
      return;
    }
    routingRef.current = true;
    setRouting(true);
    const nextSegments = walkingSegmentsRef.current.slice(0, fromSegment);
    walkingSegmentsRef.current = nextSegments;
    setWalkingSegments([...nextSegments]);
    try {
      for (let index = fromSegment; index < next.length - 1; index += 1) {
        const previousEnd = index > 0 ? nextSegments[index - 1]?.points.at(-1) : undefined;
        const start = previousEnd ?? next[index];
        const response = await fetch("/api/walking-routes/segment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            points: [
              { latitude: start.lat, longitude: start.lng },
              { latitude: next[index + 1].lat, longitude: next[index + 1].lng },
            ],
            routeMode: "SHORTEST",
          }),
        });
        const body = await response.json();
        if (!response.ok) throw new Error(body.message ?? "카카오 도보 경로를 계산하지 못했어요.");
        const routePoints = (body.points as WalkingRoutePoint[]).map(({ latitude, longitude }) => ({ lat: latitude, lng: longitude }));
        if (routePoints.length < 2) throw new Error("표시할 도보 경로가 없습니다.");
        if (previousEnd) routePoints[0] = previousEnd;
        const isClosingSegment = next.length > 2 && samePoint(next[0], next.at(-1)!) && index === next.length - 2;
        if (isClosingSegment && nextSegments[0]?.points[0]) {
          const routeStart = nextSegments[0].points[0];
          routePoints[routePoints.length - 1] = routeStart;
        }
        nextSegments[index] = { distanceMeters: body.distanceMeters, points: routePoints };
        walkingSegmentsRef.current = [...nextSegments];
        setWalkingSegments([...nextSegments]);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "도보 경로를 계산하지 못했어요.");
    } finally {
      routingRef.current = false;
      setRouting(false);
    }
  }, []);
  const updatePoints = useCallback((next: RoutePoint[]) => {
    if (routingRef.current) return;
    const previous = anchorsRef.current;
    anchorsRef.current = next;
    dispatch({ type: "replace", points: next });
    setMessage("");
    if (initialCourse) setRouteDirty(true);
    if (next.length < 2) {
      walkingSegmentsRef.current = [];
      setWalkingSegments([]);
      return;
    }
    const isAppend = next.length === previous.length + 1 && previous.every((point, index) => samePoint(point, next[index]));
    let changedIndex = 0;
    while (changedIndex < Math.min(previous.length, next.length) && samePoint(previous[changedIndex], next[changedIndex])) changedIndex += 1;
    const fromSegment = initialCourse && !routeDirty
      ? 0
      : isAppend && walkingSegmentsRef.current.length === previous.length - 1
        ? previous.length - 1
        : Math.max(0, changedIndex - 1);
    void calculateWalkingRoute(next, Math.min(next.length - 2, fromSegment));
  }, [calculateWalkingRoute, initialCourse, routeDirty]);
  const selectPoint = useCallback(
    (index: number) => dispatch({ type: "select", index }),
    [],
  );
  async function saveCourse() {
    if (savingRef.current) return;
    if (name.trim().length > 30) {
      setMessage("코스 이름은 30자 이하로 입력해 주세요.");
      return;
    }
    const distinctPoints = new Set(
      points.map((point) => `${point.lat},${point.lng}`),
    );
    if (
      !name.trim() ||
      distinctPoints.size < 3 ||
      !closed ||
      routing ||
      ((!initialCourse || routeDirty) && (walkingSegments.length !== points.length - 1 || walkingRoute.length < 2)) ||
      length < 1 ||
      length > 100000
    ) {
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
            routeWaypoints: {
              type: "LineString",
              coordinates: points.map(({ lat, lng }) => [lng, lat]),
            },
            published,
            elevationProfile,
          }),
        },
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      router.push(`/courses/${result.id}`);
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
  const routeTools = useMemo(() => {
    function CourseRouteTools({
      locating,
      locationMessage,
      moveToCurrentLocation,
    }: {
      locating: boolean;
      locationMessage: string;
      moveToCurrentLocation: () => void;
    }) {
      return (
        <>
          <button
            type="button"
            className={mapStyles.editorToolLocation}
            title="현재 위치로 지도 이동"
            onClick={moveToCurrentLocation}
            disabled={locating}
            aria-describedby={
              locationMessage ? "editor-location-status" : undefined
            }
          >
            <EditorToolIcon tool="location" />
            <span>현재 위치로 이동</span>
          </button>
          <button
            type="button"
            className={mapStyles.editorToolReset}
            title="전체 경로 초기화"
            disabled={!points.length}
            onClick={() => updatePoints([])}
          >
            <EditorToolIcon tool="reset" />
            <span>전체 지우기</span>
          </button>
        </>
      );
    }
    return CourseRouteTools;
  }, [points.length, updatePoints]);
  return (
    <>
      <p className={`${uiStyles.editorHint} ${editorStyles.editorIntro}`}>
        지도에 점을 찍어 나만의 코스를 그려보세요.
      </p>
      <fieldset className={formStyles.editorSaveFields} disabled={saving || routing}>
        <div className={editorStyles.editorGrid}>
          <section aria-label="코스 경로 편집">
            <EditorMap
              points={points}
              displayRoute={walkingRoute}
              selected={selected}
              onChange={updatePoints}
              onSelect={selectPoint}
              closed={closed}
              tools={routeTools}
            />
            <aside
              className={editorStyles.mapInstructions}
              aria-label="지도 그리는 방법"
            >
              <header className={editorStyles.mapInstructionsHeader}>
                <div>
                  <h3>지도 그리는 방법</h3>
                  <p>
                    마우스 클릭과 드래그로 손쉽게 나만의 코스를 완성해보세요.
                  </p>
                </div>
              </header>
              <ul className={editorStyles.mapInstructionList}>
                <li>
                  <span
                    className={editorStyles.mapInstructionIcon}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </span>
                  <span className={editorStyles.mapInstructionText}>
                    <strong>경로점 추가</strong>
                    <span>
                      <b>지도 클릭</b>
                      <span>원하는 지점</span>
                    </span>
                  </span>
                </li>
                <li>
                  <span
                    className={editorStyles.mapInstructionIcon}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="m5 9-3 3 3 3M9 5l3-3 3 3m0 14-3 3-3-3m10-10 3 3-3 3M2 12h20M12 2v20" />
                    </svg>
                  </span>
                  <span className={editorStyles.mapInstructionText}>
                    <strong>위치 수정</strong>
                    <span>
                      <b>점 드래그</b>
                      <span>위치 이동</span>
                    </span>
                  </span>
                </li>
                <li>
                  <span
                    className={`${editorStyles.mapInstructionIcon} ${editorStyles.mapInstructionDeleteIcon}`}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 24 24">
                      <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v6m4-6v6" />
                    </svg>
                  </span>
                  <span className={editorStyles.mapInstructionText}>
                    <strong>경로점 삭제</strong>
                    <span>
                      <b>점 더블클릭</b>
                    </span>
                  </span>
                </li>
              </ul>
              <p className={editorStyles.mapInstructionsTip}>
                <svg aria-hidden="true" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 11v5m0-8h.01" />
                </svg>
                <span>
                  곡선 구간은 점을 촘촘히 찍을수록 정확한 거리와 고도 데이터가
                  계산됩니다.
                </span>
              </p>
            </aside>
            <CourseElevation
              route={geojson}
              length={length}
              initialProfile={initialCourse?.elevationProfile}
              onProfileChange={setElevationProfile}
            />
          </section>
          <section
            className={uiStyles.courseInfo + " " + formStyles.editorFields}
            aria-labelledby="editor-info-title"
          >
            <header className={editorStyles.editorInfoHeading}>
              <h2 id="editor-info-title">코스 정보 입력</h2>
            </header>
            <label>
              <span className={editorStyles.editorFieldHeading}>
                <span>
                  코스 이름{" "}
                  <span className={editorStyles.editorRequired}>(필수)</span>
                </span>
                <span className={editorStyles.editorFieldHint}>최대 30자</span>
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
              className={editorStyles.editorCourseType}
              aria-describedby="editor-type-help"
            >
              <legend>코스 유형</legend>
              <div className={editorStyles.editorTypeOptions}>
                <label>
                  <input
                    type="radio"
                    name="courseType"
                    value="LOOP"
                    checked={courseType === "LOOP"}
                    onChange={(event) => setCourseType(event.target.value)}
                  />
                  <span>순환형</span>
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
              <span
                className={
                  editorStyles.editorFieldHeading +
                  " " +
                  editorStyles.editorDescriptionHeading
                }
              >
                <span>
                  코스 설명{" "}
                  <span className={editorStyles.editorRequired}>(선택)</span>
                </span>
                <span className={editorStyles.editorFieldHint}>최대 300자</span>
              </span>
              <textarea
                value={description}
                maxLength={300}
                rows={5}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="이 코스의 특징, 추천하는 이유 등 자유롭게 작성해주세요."
              />
            </label>
            <CourseVisibilityToggle
              published={published}
              onChange={setPublished}
              disabled={saving || routing}
            />
            <button
              className={formStyles.buttonPrimary}
              type="button"
              onClick={saveCourse}
              disabled={saving || !canSave}
            >
              {saving
                ? "저장 중…"
                : initialCourse
                  ? "수정 저장"
                  : "코스 저장 및 등록"}
            </button>
            <p role="status" className={formStyles.editorMessage}>
              {message}
            </p>
          </section>
        </div>
      </fieldset>
    </>
  );
}
