# Frontend

설정과 실행 방법은 [루트 README](../README.md)를 참고하세요.

## 코스 목록
`/`에서 Server Component가 `BACKEND_URL/api/courses`를 호출합니다.
Kotlin 서버와 DB를 실행하면 공개 코스 목록을 확인할 수 있습니다.

- URL 예: `/?page=0&size=3` (page는 0부터, size는 3·6·12 중 선택, 기본값 6)
- 페이지당 개수 적용 시 첫 페이지로 이동합니다.
- 잘못된 page/size는 기본 목록 `/`로 이동합니다.
- 로딩: Suspense 스켈레톤, 실패: error boundary와 재시도, 빈 목록: 안내 화면.
- 위치·거리 필터는 후속 구현입니다. 코스 카드를 선택하면 상세 화면으로 이동합니다.
- 코스 거리는 m를 km로 변환해 소수 둘째 자리까지 표시합니다.
- 개발용 샘플에는 가상 경로 안내가 표시됩니다.

## 코스 상세
- 경로: `/courses/{id}`. Server Component가 상세 API를 조회합니다.
- 지도: Google Maps JavaScript API와 공식 `@googlemaps/js-api-loader`를 사용합니다.
- 전체 경로·Advanced Marker 출발/도착 표시·확대/축소·전체 경로 맞추기를 제공합니다.
- GeoJSON의 [경도, 위도]를 Google Maps의 `{lat, lng}`로 변환합니다.
- 지도는 Client Component에서 동적으로 로드하고 SDK 로딩 요청을 공유합니다.
- `?page=1&size=3`처럼 목록 상태를 전달해 목록 복귀 시 유지합니다.
- 없는 코스·비공개 코스·잘못된 ID는 찾을 수 없음 안내, 통신 실패는 재시도 화면입니다.
- 키 미설정, SDK 로딩 실패/15초 시간 초과, 인증 실패에 대한 안내를 제공합니다.
- 등록 코스는 출발점과 도착점이 일치한다는 V1 규칙을 사용합니다.

## Google Maps 설정
1. Google Cloud 프로젝트에서 결제 계정을 연결하고 **Maps JavaScript API**를 활성화합니다.
2. 웹사이트용 API 키를 생성하고 애플리케이션 제한을 **웹사이트(HTTP referrers)**로 설정합니다.
   로컬 개발은 `http://localhost:3000/*`, 필요한 경우 `http://127.0.0.1:3000/*`를 등록합니다.
   다른 포트로 실행하면 그 주소도 추가하세요. 배포 도메인은 정확한 도메인으로 별도 등록합니다.
3. API 제한은 **Maps JavaScript API**로 지정합니다.
4. `.env.local`에 아래 값을 추가합니다. 기존 `BACKEND_URL` 설정은 유지하세요.

```dotenv
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=본인의_웹사이트용_API_키
NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID=
```

Advanced Marker를 위해 지도 ID가 필요하며 개발 시 기본 `DEMO_MAP_ID`를 사용합니다.
배포 시 Google Cloud에서 만든 JavaScript용 지도 ID를 두 번째 변수에 입력하세요.

`NEXT_PUBLIC_` 값은 브라우저 번들에 포함됩니다. 서버용 비밀키를 넣지 마세요.
키의 사용 범위는 Google Cloud의 웹사이트/API 제한으로 관리합니다.
`.env.local`은 Git에서 제외되며 예시 파일에 실제 키를 기록하지 않습니다.
환경변수를 변경한 뒤 개발 서버를 재시작하세요. 프로덕션에서는 다시 빌드해야 반영됩니다.
실제 지도 사용은 Google Maps Platform의 사용량과 요금 정책을 따릅니다.
이 프로젝트는 저장된 경로를 표시하며 Routes API를 호출하지 않습니다.

- [공식 SDK 로딩 안내](https://developers.google.com/maps/documentation/javascript/load-maps-js-api)
- [API 키·설정 안내](https://developers.google.com/maps/documentation/javascript/get-api-key)
- [Advanced Marker 시작하기](https://developers.google.com/maps/documentation/javascript/advanced-markers/start)
