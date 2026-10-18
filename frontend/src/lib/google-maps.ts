import { importLibrary, setOptions } from "@googlemaps/js-api-loader";

type Libraries = {
  maps: google.maps.MapsLibrary;
  marker: google.maps.MarkerLibrary;
  core: google.maps.CoreLibrary;
};

let configured = false;
let librariesPromise: Promise<Libraries> | undefined;

// 화면 이동이나 Strict Mode에서 SDK를 중복 로드하지 않도록 공유합니다.
export function loadGoogleMaps(apiKey: string): Promise<Libraries> {
  if (!configured) {
    setOptions({ key: apiKey, v: "weekly", language: "ko", region: "KR" });
    configured = true;
  }
  if (!librariesPromise) {
    librariesPromise = Promise.all([
      importLibrary("maps"), importLibrary("marker"), importLibrary("core"),
    ]).then(([maps, marker, core]) => ({ maps, marker, core })).catch((error) => {
      librariesPromise = undefined;
      throw error;
    });
  }
  return librariesPromise;
}

declare global {
  interface Window { gm_authFailure?: () => void }
}

const authFailureListeners = new Set<() => void>();
let authCallbackInstalled = false;

// 인증 오류는 SDK 로딩 Promise가 성공한 이후에도 발생할 수 있습니다.
export function onGoogleMapsAuthFailure(listener: () => void) {
  if (!authCallbackInstalled) {
    const previous = window.gm_authFailure;
    window.gm_authFailure = () => {
      try { previous?.(); }
      finally { authFailureListeners.forEach((callback) => callback()); }
    };
    authCallbackInstalled = true;
  }
  authFailureListeners.add(listener);
  return () => { authFailureListeners.delete(listener); };
}
