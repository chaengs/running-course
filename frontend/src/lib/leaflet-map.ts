import L from "leaflet";

// 작성·수정·상세 화면에서 동일한 타일과 라이선스 표시를 사용합니다.
export function createMapTiles() {
  return L.tileLayer(process.env.NEXT_PUBLIC_OSM_TILE_URL?.trim() || "https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
  });
}
