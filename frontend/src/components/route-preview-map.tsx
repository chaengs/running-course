"use client";
import previewStyles from "@/components/route-preview.module.css";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { createMapTiles } from "@/lib/leaflet-map";
type Route = {
  type: "LineString";
  coordinates: [number, number][];
};
function isRoute(value: unknown): value is Route {
  if (!value || typeof value !== "object") return false;
  const route = value as Route;
  return (
    route.type === "LineString" &&
    Array.isArray(route.coordinates) &&
    route.coordinates.length >= 2 &&
    route.coordinates.every(
      (point) =>
        Array.isArray(point) &&
        point.length === 2 &&
        Number.isFinite(point[0]) &&
        Number.isFinite(point[1]) &&
        Math.abs(point[0]) <= 180 &&
        Math.abs(point[1]) <= 90,
    )
  );
}
export default function RoutePreviewMap({
  courseId,
  name,
}: {
  courseId: number;
  name: string;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    let map: L.Map | undefined;
    let observer: ResizeObserver | undefined;
    let tiles: L.TileLayer | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      try {
        const response = await fetch(`/api/courses/${courseId}/preview`, {
          signal: AbortSignal.any([
            controller.signal,
            AbortSignal.timeout(10000),
          ]),
        });
        if (!response.ok) throw new Error("preview unavailable");
        const route: unknown = await response.json();
        if (!isRoute(route)) throw new Error("invalid route");
        if (controller.signal.aborted || !container.current) return;
        const path: L.LatLngTuple[] = route.coordinates.map(([lng, lat]) => [
          lat,
          lng,
        ]);
        map = L.map(container.current, {
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false,
          touchZoom: false,
          boxZoom: false,
          keyboard: false,
          zoomControl: false,
          attributionControl: false,
          zoomAnimation: false,
          fadeAnimation: false,
          markerZoomAnimation: false,
        });
        const bounds = L.latLngBounds(path);
        const fit = () => {
          map?.invalidateSize({ pan: false });
          map?.fitBounds(bounds, {
            padding: [22, 22],
            maxZoom: 16,
            animate: false,
          });
        };
        fit();
        tiles = createMapTiles();
        let failed = false;
        timer = setTimeout(() => setTileError(true), 15000);
        tiles.on("tileerror", () => {
          failed = true;
          setTileError(true);
        });
        tiles.on("load", () => {
          clearTimeout(timer);
          if (!failed) setTileError(false);
        });
        tiles.addTo(map);
        L.polyline(path, {
          color: "#1450ff",
          weight: 3,
          opacity: 1,
          interactive: false,
        }).addTo(map);
        L.circleMarker(path[0], {
          radius: 5,
          color: "white",
          weight: 2,
          fillColor: "#00c96b",
          fillOpacity: 1,
          interactive: false,
        }).addTo(map);
        observer = new ResizeObserver(fit);
        observer.observe(container.current);
        setStatus("ready");
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }
    void load();
    return () => {
      controller.abort();
      clearTimeout(timer);
      observer?.disconnect();
      tiles?.off();
      map?.remove();
    };
  }, [courseId]);
  return (
    <>
      <div
        ref={container}
        className={previewStyles.previewMapCanvas}
        role="img"
        aria-label={`${name} 실제 경로 지도 미리보기 · 초록 점은 출발점`}
      />
      {status !== "ready" && (
        <div className={previewStyles.previewPlaceholder} role="status">
          {status === "error"
            ? "미리보기를 불러오지 못했어요. 상세에서 확인해 주세요."
            : "경로를 불러오고 있어요…"}
        </div>
      )}
      {status === "ready" && (
        <>
          <span className={previewStyles.previewAttribution}>
            ©{" "}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noreferrer"
            >
              OpenStreetMap
            </a>
          </span>
          {tileError && (
            <span className={previewStyles.previewTileError}>
              지도 배경 연결 지연 · 실제 경로 표시 중
            </span>
          )}
        </>
      )}
    </>
  );
}
