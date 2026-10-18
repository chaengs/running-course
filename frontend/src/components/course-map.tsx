"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CourseDetail } from "@/lib/courses";
import { createMapTiles } from "@/lib/leaflet-map";

type Props = { route: CourseDetail["routeGeojson"]; name: string };

export default function CourseMap({ route, name }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tilesRef = useRef<L.TileLayer | null>(null);
  const boundsRef = useRef<L.LatLngBounds | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const valid = route.type === "LineString" && route.coordinates.length >= 2 && route.coordinates.every(
    (point) => point.length === 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
      Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90,
  );

  useEffect(() => {
    if (!container.current || !valid) return;
    const path: L.LatLngTuple[] = route.coordinates.map(([lng, lat]) => [lat, lng]);
    const map = L.map(container.current, { scrollWheelZoom: false }).setView(path[0], 13);
    mapRef.current = map;
    const bounds = L.latLngBounds(path);
    boundsRef.current = bounds;
    const tiles = createMapTiles();
    tilesRef.current = tiles;
    let failed = false;
    let timer: ReturnType<typeof setTimeout>;
    const deadline = () => {
      clearTimeout(timer);
      timer = setTimeout(() => { failed = true; setStatus("error"); }, 15000);
    };
    tiles.on("loading", () => { failed = false; setStatus("loading"); deadline(); });
    tiles.on("tileerror", () => { failed = true; setStatus("error"); });
    tiles.on("load", () => { clearTimeout(timer); setStatus(failed ? "error" : "ready"); });
    tiles.addTo(map);
    L.polyline(path, { color: "#23533d", weight: 5, opacity: 0.95 }).addTo(map);
    const first = path[0];
    const last = path[path.length - 1];
    const closed = first[0] === last[0] && first[1] === last[1];
    function marker(position: L.LatLngTuple, label: string, title: string) {
      L.marker(position, {
        title, alt: title,
        icon: L.divIcon({ className: "route-endpoint", html: `<span>${label}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] }),
      }).addTo(map).bindTooltip(title);
    }
    marker(first, "S", closed ? "출발 · 도착" : "출발");
    if (!closed) marker(last, "E", "도착");
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 17 });
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container.current);
    return () => {
      clearTimeout(timer);
      observer.disconnect();
      tiles.off();
      map.remove();
      mapRef.current = null;
      boundsRef.current = null;
      tilesRef.current = null;
    };
  }, [route, valid]);

  if (!valid) return <div className="route-map map-placeholder" role="status">표시할 수 있는 경로 정보가 없어요.</div>;

  return <div className="route-map-wrapper">
    <div ref={container} className="route-map" role="region" aria-label={`${name} 전체 경로 OpenStreetMap 지도`} />
    <div className="map-tools">
      <span className="map-legend"><i aria-hidden="true" />러닝 경로 · S 출발점{route.coordinates[0][0] !== route.coordinates.at(-1)?.[0] || route.coordinates[0][1] !== route.coordinates.at(-1)?.[1] ? " · E 도착점" : " · 도착점"}</span>
      <button type="button" onClick={() => {
        if (boundsRef.current) mapRef.current?.fitBounds(boundsRef.current, { padding: [40, 40], maxZoom: 17 });
      }}>전체 경로 보기</button>
    </div>
    {status === "loading" && <p className="map-error" role="status">지도 배경을 불러오고 있어요…</p>}
    {status === "error" && <div className="map-error" role="status">지도 배경 일부를 불러오지 못했어요. 경로는 계속 확인할 수 있어요. <button type="button" onClick={() => tilesRef.current?.redraw()}>지도 다시 불러오기</button></div>}
  </div>;
}
