"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RoutePoint } from "./course-editor";

type Props = { points: RoutePoint[]; selected: number | null; closed: boolean; onChange: (points: RoutePoint[]) => void; onSelect: (index: number) => void };

export default function EditorMap(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const latest = useRef(props);
  const [tileError, setTileError] = useState(false);

  useEffect(() => { latest.current = props; });
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { doubleClickZoom: false }).setView([37.528, 126.934], 16);
    map.current = instance;
    const tiles = L.tileLayer(process.env.NEXT_PUBLIC_OSM_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(instance);
    tiles.on("tileerror", () => setTileError(true));
    instance.on("click", (event: L.LeafletMouseEvent) => {
      const current = latest.current;
      if (current.closed) return;
      current.onChange([...current.points, { lat: event.latlng.lat, lng: event.latlng.lng }]);
    });
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const layer = L.layerGroup().addTo(map.current);
    L.polyline(props.points, { color: "#7c3aed", weight: 5 }).addTo(layer);
    props.points.forEach((point, index) => {
      if (props.closed && index === props.points.length - 1) return;
      const marker = L.marker(point, {
        draggable: true,
        title: `${index + 1}번 경로점${index === 0 ? " (출발점)" : ""}`,
        icon: L.divIcon({ className: `route-editor-point${props.selected === index ? " selected" : ""}`, html: `<span>${index + 1}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
      }).addTo(layer);
      marker.on("click", () => latest.current.onSelect(index));
      marker.on("dragend", () => {
        const current = latest.current;
        const position = marker.getLatLng();
        const next = current.points.map((item, i) => i === index || (current.closed && index === 0 && i === current.points.length - 1) ? { lat: position.lat, lng: position.lng } : item);
        current.onChange(next);
      });
    });
    return () => { layer.remove(); };
  }, [props.points, props.selected, props.closed]);

  return <>
    <div ref={container} className="editor-map" aria-label="클릭해서 경로점을 추가하는 OpenStreetMap 편집 지도" />
    {tileError && <p role="status" className="editor-message">지도 배경을 불러오지 못한 구간이 있어요. 네트워크를 확인하거나 페이지를 다시 불러와 주세요.</p>}
    {props.closed && <p className="map-caption">닫힌 경로입니다. 점을 더 추가하려면 되돌리기로 마지막 연결을 취소하세요.</p>}
  </>;
}
