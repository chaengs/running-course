"use client";

import { memo, useEffect, useId, useRef, useState } from "react";
import { elevationAxis } from "@/lib/elevation-chart";

type Route = { type: string; coordinates: number[][] };
type Profile = {
  samples: { distanceMeters: number; elevationMeters: number; rawElevationMeters: number }[];
  minElevationMeters: number; maxElevationMeters: number; ascentMeters: number; descentMeters: number;
  distanceMeters: number; sampleIntervalMeters: number; dataset: string; calculatedAt: string; algorithmVersion: string;
  difficulty: { level: "LOW" | "MEDIUM" | "HIGH"; ascentMetersPerKm: number; policyVersion: string };
};

const difficultyLabels = { LOW: "하", MEDIUM: "중", HIGH: "상" };

function ElevationChart({ profile }: { profile: Profile }) {
  const gradient = useId();
  const [selected, setSelected] = useState(0);
  const samples = profile.samples;
  const axis = elevationAxis(profile.minElevationMeters, profile.maxElevationMeters);
  const height = (value: number) => 15 + (axis.max - value) / (axis.max - axis.min) * 180;
  const x = (i: number) => samples[i].distanceMeters / profile.distanceMeters * 700;
  const y = (i: number) => height(samples[i].elevationMeters);
  const line = samples.map((_, i) => `${x(i).toFixed(2)},${y(i).toFixed(2)}`).join(" ");
  const point = samples[selected];
  return <>
    <div className="elevation-chart-labels"><span>고도 (m)</span><span>최저 {Math.round(profile.minElevationMeters)}m · 최고 {Math.round(profile.maxElevationMeters)}m · 높이 차이 {Math.round(profile.maxElevationMeters - profile.minElevationMeters)}m</span></div>
    <div className="elevation-plot">
    <div className="elevation-height-axis" aria-hidden="true">{axis.ticks.map((tick) => <span key={tick} style={{ top: `${height(tick) / 210 * 100}%` }}>{tick}</span>)}</div>
    <svg className="elevation-chart" viewBox="0 0 700 210" preserveAspectRatio="none" role="img" aria-label={`경로 고도 그래프. 세로축 ${axis.min}~${axis.max}m, 눈금 간격 ${axis.step}m. 최저 ${Math.round(profile.minElevationMeters)}m, 최고 ${Math.round(profile.maxElevationMeters)}m. 아래 슬라이더로 구간별 고도를 확인할 수 있습니다.`}
      onPointerMove={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        setSelected(Math.max(0, Math.min(samples.length - 1, Math.round((event.clientX - box.left) / box.width * (samples.length - 1)))));
      }}>
      <defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1450ff" stopOpacity=".24" /><stop offset="100%" stopColor="#1450ff" stopOpacity=".01" /></linearGradient></defs>
      {axis.ticks.map((tick) => <line key={tick} x1="0" x2="700" y1={height(tick)} y2={height(tick)} stroke="#e5e9f3" strokeDasharray="4 5" />)}
      <polygon points={`0,195 ${line} 700,195`} fill={`url(#${gradient})`} />
      <polyline points={line} fill="none" stroke="#1450ff" strokeWidth="3" vectorEffect="non-scaling-stroke" />
      <line x1={x(selected)} x2={x(selected)} y1="15" y2="195" stroke="#9ba9c2" strokeDasharray="4 4" />
      <circle cx={x(selected)} cy={y(selected)} r="5" fill="#00b96b" stroke="white" strokeWidth="2" />
    </svg>
    <div className="elevation-distance-axis">{[0, .25, .5, .75, 1].map((fraction) => <span key={fraction}>{(profile.distanceMeters * fraction / 1000).toFixed(1)}</span>)}</div>
    </div>
    <p className="elevation-scale-note">세로 눈금 {axis.step}m · 작은 높이 차이가 과장되지 않도록 최소 100m 범위로 표시해요.</p>
    <label className="elevation-scrubber">경로 위치 (km)
      <input type="range" min={0} max={samples.length - 1} value={selected} onChange={(event) => setSelected(Number(event.target.value))}
        aria-valuetext={`${(point.distanceMeters / 1000).toFixed(2)}km 지점, 고도 ${Math.round(point.elevationMeters)}m`} />
    </label>
    <output className="elevation-point">출발 후 {(point.distanceMeters / 1000).toFixed(2)}km · 고도 <strong>{Math.round(point.elevationMeters)}m</strong></output>
  </>;
}

function CourseElevationPanel({ route, length }: { route: Route; length: number }) {
  const [result, setResult] = useState<{ route: Route; profile: Profile } | null>(null);
  const [pendingRoute, setPendingRoute] = useState<Route | null>(null);
  const [error, setError] = useState<{ route: Route; message: string } | null>(null);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), [route]);
  const profile = result?.route === route ? result.profile : null;
  const pending = pendingRoute === route;
  const message = error?.route === route ? error.message : "";
  const canCalculate = route.coordinates.length >= 2 && length >= 1 && length <= 100000;
  const difficulty = profile?.difficulty;

  async function calculate() {
    if (pending || !canCalculate) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPendingRoute(route);
    setError(null);
    try {
      const response = await fetch("/api/elevation", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ routeGeojson: route }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(45000)]),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || "고도를 계산하지 못했어요.");
      if (!controller.signal.aborted) setResult({ route, profile: body });
    } catch (cause) {
      if (!controller.signal.aborted) setError({ route, message: cause instanceof Error && cause.name !== "TimeoutError" ? cause.message : "계산 시간이 초과됐어요. 다시 시도해 주세요." });
    } finally {
      if (!controller.signal.aborted) setPendingRoute(null);
    }
  }

  const metrics = [
    { label: "전체 거리", value: (length / 1000).toFixed(2), unit: "km", icon: "↔" },
    { label: "누적 고도", value: profile ? Math.round(profile.ascentMeters) : "—", unit: "m", icon: "↗" },
    { label: "최고 고도", value: profile ? Math.round(profile.maxElevationMeters) : "—", unit: "m", icon: "⌁" },
    { label: "예상 난이도", value: difficulty ? difficultyLabels[difficulty.level] : "—", unit: "", icon: "◴" },
  ];
  return <section className="course-elevation" aria-label="코스 고도 미리보기">
    <dl className="elevation-metrics">{metrics.map((metric) => <div key={metric.label}>
      <dt>{metric.label}<span aria-hidden="true">{metric.icon}</span></dt>
      <dd className={metric.label === "예상 난이도" ? "elevation-difficulty-value" : undefined} data-level={metric.label === "예상 난이도" ? difficulty?.level : undefined}>{metric.value}{metric.unit && <span>{metric.unit}</span>}</dd>
      {metric.label === "누적 고도" && <small className="elevation-metric-help">오르막 높이 합계</small>}
      {metric.label === "예상 난이도" && <small className="elevation-metric-help">고도 기준</small>}
    </div>)}</dl>
    <details className="elevation-difficulty-guide">
      <summary>예상 난이도 기준 보기</summary>
      <p>누적 고도는 오르막에서 올라간 높이의 합계입니다. 이를 코스 거리(km)로 나눈 값으로 고도에 따른 부담을 비교합니다.</p>
      <dl><div><dt>하</dt><dd>1km당 10m 미만</dd></div><div><dt>중</dt><dd>1km당 10m 이상, 30m 미만</dd></div><div><dt>상</dt><dd>1km당 30m 이상</dd></div></dl>
      {difficulty && <p>현재 경로: 1km당 누적 고도 {difficulty.ascentMetersPerKm.toFixed(1)}m</p>}
      <p>거리와 상승량을 함께 보는 <a href="https://utmb.world/en/sports-system" target="_blank" rel="noreferrer">KM-effort 개념</a>을 참고한 자체 실험 기준입니다. 전체 거리의 부담, 급경사 위치, 노면, 날씨와 개인 체력은 반영하지 않습니다.</p>
    </details>
    <div className="elevation-panel">
      <div className="elevation-heading"><h2>고도 프로필</h2><button type="button" onClick={calculate} disabled={!canCalculate || pending}>{pending ? "계산 중…" : profile ? "고도 다시 계산" : "고도 계산"}</button></div>
      <p className="elevation-subtitle">출발점부터 이어지는 높낮이를 미리 확인하세요.</p>
      {profile ? <ElevationChart key={profile.calculatedAt} profile={profile} /> : <div className="elevation-empty" role="status">{pending ? "경로의 지형 고도를 불러오고 있어요…" : canCalculate ? "고도 계산을 누르면 이 경로의 그래프가 표시돼요." : "지도에 경로점을 2개 이상 찍어주세요. 1m~100km 경로를 계산할 수 있어요."}</div>}
      {message && <p className="elevation-error" role="alert">{message} 코스는 고도 계산 없이 저장할 수 있어요.</p>}
      {profile && <p className="elevation-source">SRTM 30m · 조회 간격 약 {Math.round(profile.sampleIntervalMeters)}m · 계산 {new Date(profile.calculatedAt).toLocaleString("ko-KR")}</p>}
      <p className="elevation-disclaimer">지형 데이터 기반 예상 고도입니다. 다리·터널 높이는 반영하지 않으며, 경로를 수정하면 다시 계산해야 합니다. 고도 미리보기는 코스에 저장되지 않습니다.</p>
      <a className="elevation-source" href="https://www.opentopodata.org/datasets/srtm/" target="_blank" rel="noreferrer">고도 데이터: Open Topo Data / SRTM ↗</a>
    </div>
  </section>;
}

export const CourseElevation = memo(CourseElevationPanel);
