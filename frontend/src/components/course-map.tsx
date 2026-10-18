"use client";

import { useEffect, useRef, useState } from "react";
import type { CourseDetail } from "@/lib/courses";
import { loadGoogleMaps, onGoogleMapsAuthFailure } from "@/lib/google-maps";

type Props = { route: CourseDetail["routeGeojson"]; name: string };

export default function CourseMap({ route, name }: Props) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const boundsRef = useRef<google.maps.LatLngBounds | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID?.trim() || "DEMO_MAP_ID";
  const valid = route.type === "LineString" && route.coordinates.length >= 2 && route.coordinates.every(
    (point) => point.length >= 2 && Number.isFinite(point[0]) && Number.isFinite(point[1]) &&
      Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 90,
  );

  useEffect(() => {
    if (!container.current || !valid || !apiKey) return;
    const element = container.current;
    let cancelled = false;
    let authFailed = false;
    let disposeMap: (() => void) | undefined;
    const unsubscribeAuth = onGoogleMapsAuthFailure(() => {
      authFailed = true;
      if (!cancelled) setStatus("error");
    });
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<never>((_, reject) => {
      timeout = setTimeout(() => reject(new Error("Map SDK load timed out")), 15000);
    });

    Promise.race([loadGoogleMaps(apiKey), deadline]).then(({ maps, marker, core }) => {
      if (cancelled || authFailed) return;
      // GeoJSON의 [경도, 위도]를 Google Maps의 {lat, lng}로 변환합니다.
      const path = route.coordinates.map(([lng, lat]) => ({ lat, lng }));
      const map = new maps.Map(element, {
        center: path[0], zoom: 13, mapId,
        mapTypeControl: false, streetViewControl: false,
        zoomControl: true, fullscreenControl: true,
        gestureHandling: "cooperative", clickableIcons: false,
      });
      mapRef.current = map;
      const bounds = new core.LatLngBounds();
      path.forEach((point) => bounds.extend(point));
      boundsRef.current = bounds;
      const line = new maps.Polyline({
        map, path, strokeColor: "#23533d", strokeWeight: 5, strokeOpacity: 0.95,
      });
      const first = path[0];
      const last = path[path.length - 1];
      const closed = first.lat === last.lat && first.lng === last.lng;
      const markers: google.maps.marker.AdvancedMarkerElement[] = [];
      const addMarker = (position: google.maps.LatLngLiteral, label: string, title: string) => {
        const pin = new marker.PinElement({ glyphText: label, background: "#23533d", borderColor: "white", glyphColor: "white" });
        const point = new marker.AdvancedMarkerElement({ map, position, title });
        point.append(pin);
        markers.push(point);
      };
      addMarker(first, "S", closed ? "출발 · 도착" : "출발");
      if (!closed) addMarker(last, "E", "도착");
      map.fitBounds(bounds, 48);
      const observer = new ResizeObserver(() => map.fitBounds(bounds, 48));
      observer.observe(element);
      disposeMap = () => {
        observer.disconnect();
        markers.forEach((point) => { point.map = null; });
        line.setMap(null);
        core.event.clearInstanceListeners(map);
        map.unbindAll();
        element.replaceChildren();
      };
      setStatus("ready");
    }).catch(() => {
      if (!cancelled) setStatus("error");
    }).finally(() => { if (timeout) clearTimeout(timeout); });

    return () => {
      cancelled = true;
      if (timeout) clearTimeout(timeout);
      unsubscribeAuth();
      disposeMap?.();
      mapRef.current = null;
      boundsRef.current = null;
    };
  }, [route, valid, apiKey, mapId]);

  if (!valid) return <div className="route-map map-placeholder" role="status">표시할 수 있는 경로 정보가 없어요.</div>;
  if (!apiKey) return (
    <div className="route-map map-placeholder" role="status">
      <div><strong>지도 연결이 준비되지 않았어요</strong><p>코스 정보는 계속 확인할 수 있어요.</p></div>
    </div>
  );

  return (
    <div className="route-map-wrapper">
      <div className="map-stage">
        <div ref={container} className="route-map" role="region" aria-label={`${name} 전체 경로 Google 지도`} />
        {status !== "ready" && <div className="map-status-overlay" role="status">
          {status === "loading" ? <p>Google 지도를 불러오고 있어요…</p> : <div><strong>지도를 불러오지 못했어요</strong><p>잠시 후 다시 시도해 주세요.</p><button className="button-primary" type="button" onClick={() => window.location.reload()}>다시 시도</button></div>}
        </div>}
      </div>
      <div className="map-tools"><span className="map-legend"><i aria-hidden="true" />러닝 경로 · S 출발점</span><button type="button" disabled={status !== "ready"} onClick={() => {
        if (boundsRef.current) mapRef.current?.fitBounds(boundsRef.current, 48);
      }}>전체 경로 보기</button></div>
    </div>
  );
}
