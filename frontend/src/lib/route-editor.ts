export type RoutePoint = { lat: number; lng: number };
export type RouteEditorState = { points: RoutePoint[]; history: RoutePoint[][]; selected: number | null };
export type RouteEditorAction =
  | { type: "replace"; points: RoutePoint[] }
  | { type: "select"; index: number }
  | { type: "undo" };

export const initialRouteEditorState: RouteEditorState = { points: [], history: [], selected: null };

export function routeEditorReducer(state: RouteEditorState, action: RouteEditorAction): RouteEditorState {
  switch (action.type) {
    case "select": return { ...state, selected: action.index };
    case "replace": return { points: action.points, history: [...state.history.slice(-49), state.points], selected: null };
    case "undo": {
      const previous = state.history.at(-1);
      return previous ? { points: previous, history: state.history.slice(0, -1), selected: null } : state;
    }
  }
}

// 입력한 선분의 지표면 길이입니다. 도로 추종이나 통행 가능 여부는 검증하지 않습니다.
export function routeLength(points: RoutePoint[]) {
  const rad = Math.PI / 180;
  return points.slice(1).reduce((sum, point, index) => {
    const previous = points[index];
    const a = Math.sin((point.lat - previous.lat) * rad / 2) ** 2 +
      Math.cos(previous.lat * rad) * Math.cos(point.lat * rad) * Math.sin((point.lng - previous.lng) * rad / 2) ** 2;
    return sum + 6371008.8 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
  }, 0);
}
