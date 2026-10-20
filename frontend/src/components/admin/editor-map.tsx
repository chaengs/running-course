"use client";
import mapStyles from "@/components/admin/editor-map.module.css";
import formStyles from "@/components/form.module.css";
import {
  memo,
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type ComponentType,
} from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { RoutePoint } from "@/lib/route-editor";
import { createMapTiles } from "@/lib/leaflet-map";
type Props = {
  points: RoutePoint[];
  selected: number | null;
  closed: boolean;
  onChange: (points: RoutePoint[]) => void;
  onSelect: (index: number) => void;
  tools: ComponentType<{
    locating: boolean;
    locationMessage: string;
    moveToCurrentLocation: () => void;
  }>;
};
function EditorMap(props: Props) {
  const Tools = props.tools;
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<L.Map | null>(null);
  const initialPoints = useRef(props.points);
  const markers = useRef<L.Marker[]>([]);
  const pendingStartClick = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tileError, setTileError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationMessage, setLocationMessage] = useState("");
  const locationPending = useRef(false);
  const locationMarker = useRef<L.CircleMarker | null>(null);
  const initialLocationRequest = useRef<Promise<GeolocationPosition> | null>(
    null,
  );
  const interacted = useRef(false);
  function moveToCurrentLocation(automatic = false) {
    const targetMap = map.current;
    if (!targetMap || locationPending.current) return;
    if (!navigator.geolocation) {
      setLocationMessage("이 브라우저에서는 현재 위치를 사용할 수 없어요.");
      return;
    }
    if (!window.isSecureContext) {
      setLocationMessage(
        "현재 위치는 HTTPS 또는 localhost에서 사용할 수 있어요.",
      );
      return;
    }
    locationPending.current = true;
    setLocating(true);
    setLocationMessage("");
    const requestPosition = () =>
      new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000,
        });
      });
    // Share the initial browser request across React Strict Mode effect replays.
    const positionRequest = automatic
      ? (initialLocationRequest.current ??= requestPosition())
      : requestPosition();
    void positionRequest
      .then(({ coords }) => {
        const instance = map.current;
        if (!instance || instance !== targetMap) return;
        const position: L.LatLngTuple = [coords.latitude, coords.longitude];
        setLocationMessage("");
        const move = !automatic || !interacted.current;
        if (move) instance.setView(position, 16);
        locationMarker.current?.remove();
        locationMarker.current = L.circleMarker(position, {
          radius: 8,
          color: "white",
          weight: 3,
          fillColor: "var(--color-primary)",
          fillOpacity: 1,
          interactive: false,
        }).addTo(instance);
      })
      .catch((error: GeolocationPositionError) => {
        if (map.current !== targetMap) return;
        setLocationMessage(
          error.code === 1
            ? "위치 권한이 거부됐어요. 브라우저 설정에서 위치 권한을 허용해 주세요."
            : error.code === 3
              ? "위치 확인 시간이 초과됐어요. 다시 시도해 주세요."
              : "현재 위치를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.",
        );
      })
      .finally(() => {
        if (map.current !== targetMap) return;
        locationPending.current = false;
        setLocating(false);
      });
  }
  const requestInitialLocation = useEffectEvent(() =>
    moveToCurrentLocation(true),
  );
  // 지도 리스너를 다시 등록하지 않고 최신 React 상태를 읽습니다.
  const addPoint = useEffectEvent((point: RoutePoint) => {
    if (!props.closed) props.onChange([...props.points, point]);
  });
  const selectPoint = useEffectEvent((index: number) => props.onSelect(index));
  const clickPoint = useEffectEvent(
    (index: number, event: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(event);
      if (pendingStartClick.current) {
        clearTimeout(pendingStartClick.current);
        pendingStartClick.current = null;
      }
      const distinctCount = new Set(
        props.points.map(({ lat, lng }) => `${lat},${lng}`),
      ).size;
      if (index === 0 && !props.closed && distinctCount >= 3) {
        // Delay loop closure briefly so a double-click can delete the start point.
        pendingStartClick.current = setTimeout(() => {
          pendingStartClick.current = null;
          props.onChange([...props.points, { ...props.points[0] }]);
        }, 260);
        return;
      }
      selectPoint(index);
    },
  );
  const doubleClickPoint = useEffectEvent(
    (index: number, event: L.LeafletMouseEvent) => {
      L.DomEvent.stopPropagation(event);
      if (pendingStartClick.current) {
        clearTimeout(pendingStartClick.current);
        pendingStartClick.current = null;
      }
      let next = props.points.filter((_, pointIndex) => pointIndex !== index);
      if (props.closed && index === 0) next = next.slice(0, -1);
      props.onChange(next);
    },
  );
  const movePoint = useEffectEvent((index: number, position: RoutePoint) => {
    props.onChange(
      props.points.map((point, i) =>
        i === index ||
        (props.closed && index === 0 && i === props.points.length - 1)
          ? position
          : point,
      ),
    );
  });
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, {
      doubleClickZoom: false,
    }).setView([37.528, 126.934], 16);
    // 수정 화면 진입 시 저장된 경로가 있는 위치를 먼저 보여줍니다.
    if (initialPoints.current.length > 1)
      instance.fitBounds(L.latLngBounds(initialPoints.current), {
        padding: [24, 24],
      });
    map.current = instance;
    const tiles = createMapTiles().addTo(instance);
    tiles.on("tileerror", () => setTileError(true));
    instance.on("click", (event: L.LeafletMouseEvent) => {
      interacted.current = true;
      addPoint({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    instance.on("dragstart zoomstart", () => {
      interacted.current = true;
    });
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    // Saved routes take priority in the editor. New routes start at the runner's location.
    if (initialPoints.current.length === 0) requestInitialLocation();
    return () => {
      locationPending.current = false;
      setLocating(false);
      locationMarker.current = null;
      observer.disconnect();
      instance.remove();
      map.current = null;
    };
  }, []);
  useEffect(() => {
    if (!map.current) return;
    const layer = L.layerGroup().addTo(map.current);
    markers.current = [];
    L.polyline(props.points, { color: "var(--color-primary)", weight: 5 }).addTo(layer);
    props.points.forEach((point, index) => {
      if (props.closed && index === props.points.length - 1) return;
      const marker = L.marker(point, {
        draggable: true,
        title: `${index + 1}번 경로점${index === 0 ? " (출발점)" : ""}`,
        icon: L.divIcon({
          className: mapStyles.routeEditorPoint,
          html: `<span>${index + 1}</span>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
        }),
      }).addTo(layer);
      markers.current.push(marker);
      marker.on("click", (event: L.LeafletMouseEvent) =>
        clickPoint(index, event),
      );
      marker.on("dblclick", (event: L.LeafletMouseEvent) =>
        doubleClickPoint(index, event),
      );
      marker.on("dragend", () => {
        const position = marker.getLatLng();
        movePoint(index, { lat: position.lat, lng: position.lng });
      });
    });
    return () => {
      layer.remove();
      markers.current = [];
      if (pendingStartClick.current) clearTimeout(pendingStartClick.current);
      pendingStartClick.current = null;
    };
  }, [props.points, props.closed]);
  // 선택 변경에는 기존 마커의 스타일만 갱신합니다.
  useEffect(() => {
    markers.current.forEach((marker, index) => {
      marker
        .getElement()
        ?.classList.toggle(mapStyles.selected, index === props.selected);
    });
  }, [props.selected, props.points, props.closed]);
  return (
    <>
      <div className={mapStyles.editorMapTools}>
        <div
          className={mapStyles.editorToolbar}
          role="group"
          aria-label="지도 그리기 도구"
        >
          <Tools
            locating={locating}
            locationMessage={locationMessage}
            moveToCurrentLocation={() => moveToCurrentLocation()}
          />
        </div>
        {locationMessage && (
          <p
            id="editor-location-status"
            className={mapStyles.editorLocationStatus}
            role="status"
          >
            {locationMessage}
          </p>
        )}
      </div>
      <div
        ref={container}
        className={mapStyles.editorMap}
        aria-label="클릭해서 경로점을 추가하는 OpenStreetMap 편집 지도"
      />
      {tileError && (
        <p role="status" className={formStyles.editorMessage}>
          지도 배경을 불러오지 못한 구간이 있어요. 네트워크를 확인하거나
          페이지를 다시 불러와 주세요.
        </p>
      )}
    </>
  );
}
export default memo(EditorMap);
