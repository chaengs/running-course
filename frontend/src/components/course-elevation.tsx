"use client";
import elevationStyles from "@/components/course-elevation.module.css";
import { memo, useEffect, useEffectEvent, useId, useMemo, useRef, useState, } from "react";
import { elevationAxis } from "@/lib/elevation-chart";
type Route = {
    type: string;
    coordinates: number[][];
};
type Profile = {
    samples: {
        distanceMeters: number;
        elevationMeters: number;
        rawElevationMeters: number;
    }[];
    minElevationMeters: number;
    maxElevationMeters: number;
    ascentMeters: number;
    descentMeters: number;
    distanceMeters: number;
    sampleIntervalMeters: number;
    dataset: string;
    calculatedAt: string;
    algorithmVersion: string;
    difficulty: {
        level: "LOW" | "MEDIUM" | "HIGH";
        ascentMetersPerKm: number;
        policyVersion: string;
    };
};
const difficultyLabels = { LOW: "하", MEDIUM: "중", HIGH: "상" };
function retryDelay(milliseconds: number, signal: AbortSignal) {
    return new Promise<void>((resolve, reject) => {
        if (signal.aborted) {
            reject(signal.reason);
            return;
        }
        const abort = () => {
            clearTimeout(timer);
            reject(signal.reason);
        };
        const timer = setTimeout(() => {
            signal.removeEventListener("abort", abort);
            resolve();
        }, milliseconds);
        signal.addEventListener("abort", abort, { once: true });
    });
}
function ElevationChart({ profile }: {
    profile: Profile;
}) {
    const gradient = useId();
    const [selected, setSelected] = useState(0);
    const samples = profile.samples;
    const axis = elevationAxis(profile.minElevationMeters, profile.maxElevationMeters);
    const height = (value: number) => 15 + ((axis.max - value) / (axis.max - axis.min)) * 180;
    const x = (i: number) => (samples[i].distanceMeters / profile.distanceMeters) * 700;
    const y = (i: number) => height(samples[i].elevationMeters);
    const line = samples
        .map((_, i) => `${x(i).toFixed(2)},${y(i).toFixed(2)}`)
        .join(" ");
    const point = samples[selected];
    return (<>
      <div className={elevationStyles.elevationChartLabels}>
        <span>고도 (m)</span>
        <span>
          최저 {Math.round(profile.minElevationMeters)}m · 최고{" "}
          {Math.round(profile.maxElevationMeters)}m · 높이 차이{" "}
          {Math.round(profile.maxElevationMeters - profile.minElevationMeters)}m
        </span>
      </div>
      <div className={elevationStyles.elevationPlot}>
        <div className={elevationStyles.elevationHeightAxis} aria-hidden="true">
          {axis.ticks.map((tick) => (<span key={tick} style={{ top: `${(height(tick) / 210) * 100}%` }}>
              {tick}
            </span>))}
        </div>
        <svg className={elevationStyles.elevationChart} viewBox="0 0 700 210" preserveAspectRatio="none" role="img" tabIndex={0} aria-keyshortcuts="ArrowLeft ArrowRight Home End" aria-label={`경로 고도 그래프. 세로축 ${axis.min}~${axis.max}m, 눈금 간격 ${axis.step}m. 최저 ${Math.round(profile.minElevationMeters)}m, 최고 ${Math.round(profile.maxElevationMeters)}m. 그래프를 선택한 뒤 좌우 방향키로 구간별 고도를 확인할 수 있습니다.`} onKeyDown={(event) => {
            const key = event.key;
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(key))
                return;
            event.preventDefault();
            setSelected((current) => key === "Home"
                ? 0
                : key === "End"
                    ? samples.length - 1
                    : Math.max(0, Math.min(samples.length - 1, current + (key === "ArrowRight" ? 1 : -1))));
        }} onPointerMove={(event) => {
            const box = event.currentTarget.getBoundingClientRect();
            setSelected(Math.max(0, Math.min(samples.length - 1, Math.round(((event.clientX - box.left) / box.width) *
                (samples.length - 1)))));
        }}>
          <defs>
            <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1450ff" stopOpacity=".24"/>
              <stop offset="100%" stopColor="#1450ff" stopOpacity=".01"/>
            </linearGradient>
          </defs>
          {axis.ticks.map((tick) => (<line key={tick} x1="0" x2="700" y1={height(tick)} y2={height(tick)} stroke="#e5e9f3" strokeDasharray="4 5"/>))}
          <polygon points={`0,195 ${line} 700,195`} fill={`url(#${gradient})`}/>
          <polyline points={line} fill="none" stroke="#1450ff" strokeWidth="3" vectorEffect="non-scaling-stroke"/>
          <line x1={x(selected)} x2={x(selected)} y1="15" y2="195" stroke="#9ba9c2" strokeDasharray="4 4"/>
          <circle cx={x(selected)} cy={y(selected)} r="5" fill="#00b96b" stroke="white" strokeWidth="2"/>
        </svg>
        <div className={elevationStyles.elevationDistanceAxis}>
          {[0, 0.25, 0.5, 0.75, 1].map((fraction) => (<span key={fraction}>
              {((profile.distanceMeters * fraction) / 1000).toFixed(1)}
            </span>))}
        </div>
      </div>
      <output className={elevationStyles.elevationPoint}>
        출발 후 {(point.distanceMeters / 1000).toFixed(2)}km · 고도{" "}
        <strong>{Math.round(point.elevationMeters)}m</strong>
      </output>
    </>);
}
function CourseElevationPanel({ route, length, }: {
    route: Route;
    length: number;
}) {
    const [result, setResult] = useState<{
        route: Route;
        profile: Profile;
    } | null>(null);
    const [pendingRoute, setPendingRoute] = useState<Route | null>(null);
    const [error, setError] = useState<{
        route: Route;
        message: string;
    } | null>(null);
    const request = useRef<AbortController | null>(null);
    const profile = result?.route === route ? result.profile : null;
    const pending = pendingRoute === route;
    const message = error?.route === route ? error.message : "";
    const closed = useMemo(() => {
        const points = route.coordinates;
        const first = points[0];
        const last = points.at(-1);
        return (points.length >= 4 &&
            first[0] === last?.[0] &&
            first[1] === last?.[1] &&
            new Set(points.map((point) => `${point[0]},${point[1]}`)).size >= 3);
    }, [route]);
    const canCalculate = closed && length >= 1 && length <= 100000;
    const difficulty = profile?.difficulty;
    async function calculate() {
        if (pending || request.current || !canCalculate)
            return;
        const controller = new AbortController();
        request.current = controller;
        setPendingRoute(route);
        setError(null);
        try {
            const signal = AbortSignal.any([
                controller.signal,
                AbortSignal.timeout(45000),
            ]);
            const payload = JSON.stringify({ routeGeojson: route });
            for (let attempt = 0; attempt <= 3; attempt++) {
                const response = await fetch("/api/elevation", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: payload,
                    signal,
                });
                // The Kotlin provider may still be finishing a cancelled route. Retry briefly without user input.
                if (response.status === 429 && attempt < 3) {
                    await response.body?.cancel();
                    await retryDelay(1500 * 2 ** attempt, signal);
                    continue;
                }
                const body = await response.json();
                if (!response.ok)
                    throw new Error(body.message || "고도를 계산하지 못했어요.");
                if (!controller.signal.aborted)
                    setResult({ route, profile: body });
                break;
            }
        }
        catch (cause) {
            if (!controller.signal.aborted)
                setError({
                    route,
                    message: cause instanceof Error && cause.name !== "TimeoutError"
                        ? cause.message
                        : "계산 시간이 초과됐어요. 다시 시도해 주세요.",
                });
        }
        finally {
            if (request.current === controller)
                request.current = null;
            if (!controller.signal.aborted)
                setPendingRoute(null);
        }
    }
    const startAutomaticCalculation = useEffectEvent(() => {
        void calculate();
    });
    useEffect(() => {
        if (!canCalculate)
            return;
        const timer = setTimeout(startAutomaticCalculation, 1200);
        return () => {
            clearTimeout(timer);
            request.current?.abort();
            request.current = null;
        };
    }, [route, canCalculate]);
    const metrics = [
        {
            label: "전체 거리",
            value: (length / 1000).toFixed(2),
            unit: "km",
            icon: "↔",
        },
        {
            label: "누적 고도",
            value: profile ? Math.round(profile.ascentMeters) : "—",
            unit: "m",
            icon: "↗",
        },
        {
            label: "최고 고도",
            value: profile ? Math.round(profile.maxElevationMeters) : "—",
            unit: "m",
            icon: "⌁",
        },
        {
            label: "예상 난이도",
            value: difficulty ? difficultyLabels[difficulty.level] : "—",
            unit: "",
            icon: "◴",
        },
    ];
    return (<section className={elevationStyles.courseElevation} aria-label="코스 고도 미리보기">
      <dl className={elevationStyles.elevationMetrics}>
        {metrics.map((metric) => (<div key={metric.label}>
            <dt>
              {metric.label}
              <span aria-hidden="true">{metric.icon}</span>
            </dt>
            <dd className={metric.label === "예상 난이도"
            ? elevationStyles.elevationDifficultyValue : undefined} data-level={metric.label === "예상 난이도" ? difficulty?.level : undefined}>
              {metric.value}
              {metric.unit && <span>{metric.unit}</span>}
            </dd>
            {metric.label === "누적 고도"}
            {metric.label === "예상 난이도" && (<small className={elevationStyles.elevationMetricHelp}>고도 기준</small>)}
          </div>))}
      </dl>
      <div className={elevationStyles.elevationPanel}>
        <div className={elevationStyles.elevationHeading}>
          <h2>고도 프로필</h2>
          <span className={elevationStyles.elevationAutoStatus} role="status">
            {pending
            ? "고도 계산 중…"
            : message
                ? "계산 오류"
                : profile
                    ? "고도 계산 완료"
                    : canCalculate
                        ? "고도 계산 대기"
                        : "경로 연결 대기"}
          </span>
          {message && (<button type="button" onClick={() => void calculate()} disabled={!canCalculate || pending}>
              다시 시도
            </button>)}
        </div>
        <p className={elevationStyles.elevationSubtitle}>
          출발점으로 연결하면 고도와 난이도를 자동으로 계산해요.
        </p>
        {profile ? (<ElevationChart key={profile.calculatedAt} profile={profile}/>) : (<div className={elevationStyles.elevationEmpty} role="status">
            {pending
                ? "경로의 지형 고도를 불러오고 있어요…"
                : message
                    ? "고도 정보를 불러오지 못했어요. 다시 시도해 주세요."
                    : canCalculate
                        ? "연결된 경로의 고도 계산을 준비하고 있어요…"
                        : "서로 다른 경로점을 3개 이상 찍고 출발점으로 연결해 주세요. 1m~100km 경로를 계산할 수 있어요."}
          </div>)}
        {message && (<p className={elevationStyles.elevationError} role="alert">
            {message} 코스는 고도 계산 없이 저장할 수 있어요.
          </p>)}
        {profile && (<p className={elevationStyles.elevationSource}>
            조회 간격 약 {Math.round(profile.sampleIntervalMeters)}m ·{" "}
            {new Date(profile.calculatedAt).toLocaleString("ko-KR")}
          </p>)}
        <a className={elevationStyles.elevationSource} href="https://www.opentopodata.org/datasets/srtm/" target="_blank" rel="noreferrer">
          고도 데이터: Open Topo Data / SRTM ↗
        </a>
      </div>
    </section>);
}
export const CourseElevation = memo(CourseElevationPanel);
