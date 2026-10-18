"use client";

import { memo, useEffect, useEffectEvent, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RoutePoint } from "@/lib/route-editor";

type Props = { points: RoutePoint[]; selected: number | null; closed: boolean; onChange: (points: RoutePoint[]) => void; onSelect: (index: number) => void };

function EditorMap(props: Props) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const initialPoints = useRef(props.points);
  const markers = useRef<L.Marker[]>([]);
  const [tileError, setTileError] = useState(false);

  // 지도 리스너를 다시 등록하지 않고 최신 React 상태를 읽습니다.
  const addPoint = useEffectEvent((point: RoutePoint) => {
    if (!props.closed) props.onChange([...props.points, point]);
  });
  const selectPoint = useEffectEvent((index: number) => props.onSelect(index));
  const movePoint = useEffectEvent((index: number, position: RoutePoint) => {
    props.onChange(props.points.map((point, i) =>
      i === index || (props.closed && index === 0 && i === props.points.length - 1) ? position : point));
  });
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { doubleClickZoom: false }).setView([37.528, 126.934], 16);
    // 수정 화면 진입 시 저장된 경로가 있는 위치를 먼저 보여줍니다.
    if (initialPoints.current.length > 1) instance.fitBounds(L.latLngBounds(initialPoints.current), { padding: [24, 24] });
    map.current = instance;
    const tiles = L.tileLayer(process.env.NEXT_PUBLIC_OSM_TILE_URL || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(instance);
    tiles.on("tileerror", () => setTileError(true));
    instance.on("click", (event: L.LeafletMouseEvent) => {
      addPoint({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    return () => { observer.disconnect(); instance.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    if (!map.current) return;
    const layer = L.layerGroup().addTo(map.current);
    markers.current = [];
    L.polyline(props.points, { color: "#7c3aed", weight: 5 }).addTo(layer);
    props.points.forEach((point, index) => {
      if (props.closed && index === props.points.length - 1) return;
      const marker = L.marker(point, {
        draggable: true,
        title: `${index + 1}번 경로점${index === 0 ? " (출발점)" : ""}`,
        icon: L.divIcon({ className: "route-editor-point", html: `<span>${index + 1}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
      }).addTo(layer);
      markers.current.push(marker);
      marker.on("click", () => selectPoint(index));
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        movePoint(index, { lat: position.lat, lng: position.lng });
      });
    });
    return () => { layer.remove(); markers.current = []; };
  }, [props.points, props.closed]);

  // 선택 변경에는 기존 마커의 스타일만 갱신합니다.
  useEffect(() => {
    markers.current.forEach((marker, index) => {
      marker.getElement()?.classList.toggle("selected", index === props.selected);
    });
  }, [props.selected, props.points, props.closed]);

  return <>
    <div ref={container} className="editor-map" aria-label="클릭해서 경로점을 추가하는 OpenStreetMap 편집 지도" />
    {tileError && <p role="status" className="editor-message">지도 배경을 불러오지 못한 구간이 있어요. 네트워크를 확인하거나 페이지를 다시 불러와 주세요.</p>}
    {props.closed && <p className="map-caption">닫힌 경로입니다. 점을 더 추가하려면 되돌리기로 마지막 연결을 취소하세요.</p>}
  </>;
}

export default memo(EditorMap);
