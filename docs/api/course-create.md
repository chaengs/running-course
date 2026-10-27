# 코스 작성·관리와 도보 경로 API

현재 코드 대조일: 2026-10-27. 별도 표기가 없으면 Kotlin 백엔드 경로입니다.
모든 작성·관리 API는 `Authorization: Bearer <session token>`이 필요합니다. 작성자 ID는 요청 본문이 아니라 세션으로 결정합니다.

## POST /api/my/courses

닫힌 GeoJSON LineString을 로그인 사용자 소유로 저장합니다. 새 코스는 비공개가 기본입니다.

| 필드 | 필수·기본값 | 검증·용도 |
| --- | --- | --- |
| `name` | 필수 | trim 후 1~100자. 현재 작성 화면은 30자까지 허용 |
| `description` | 기본 빈 문자열 | 입력 길이 300자 이하, 저장 시 trim |
| `courseType` | 필수 | `LOOP` 또는 `OUT_AND_BACK` |
| `routeGeojson` | 필수 | 실제 경로 LineString, `[경도, 위도]` 순서 |
| `published` | 생략/null이면 false | 공개 저장 여부 |
| `routeWaypoints` | 선택 | 편집용 원래 지점. 생략 시 실제 경로를 대신 저장 |
| `elevationProfile` | 선택 | 고도 API가 반환한 프로필. 생략 시 고도 없이 저장 가능 |

`routeGeojson`과 지정한 `routeWaypoints`는 모두 다음을 만족해야 합니다.

- `type`이 `LineString`
- 좌표 4~10000개, 서로 다른 지점 3개 이상
- 각 좌표가 `[경도, 위도]` 두 개의 유한한 수이며 WGS84 범위 내
- 시작과 마지막 좌표가 일치

유형과 관계없이 닫힌 경로를 요구합니다. 저장 길이는 PostGIS geography로 계산·반올림한 1~100000m이며 클라이언트의 거리 값을 사용하지 않습니다.
고도 프로필은 전달된 데이터를 저장하며 저장 API가 외부 고도를 다시 조회하거나 진위를 재계산하지 않습니다.
경로의 실제 보행 가능 여부도 저장 API에서 별도로 검증하지 않습니다.

```json
{
  "name": "동네 한 바퀴",
  "description": "공원을 돌아 출발점으로 복귀합니다.",
  "courseType": "LOOP",
  "published": false,
  "routeGeojson": {
    "type": "LineString",
    "coordinates": [[126.934, 37.528], [126.935, 37.528], [126.935, 37.529], [126.934, 37.528]]
  }
}
```

성공은 HTTP 201, 본문 `{ "id": 123, "distanceMeters": 284 }`, Location은 `/api/courses/123`입니다. 거리는 예시입니다.

브라우저는 Next.js의 `POST /api/courses`로 요청합니다. Next.js가 HttpOnly 세션을 Bearer 헤더로 전달하며 출처를 검증합니다.
작성 화면은 저장 중 중복 클릭을 막고, 신규 저장 성공 시 입력·경로·고도와 지도 내부 주소 검색어·결과·선택 위치를 초기화한 뒤 상세로 이동합니다. 저장 실패와 기존 코스 수정에서는 이 신규 작성 초기화를 수행하지 않습니다.
신규 작성 화면에서 이탈하면 저장하지 않은 초안 전체를 폐기합니다. 뒤로가기나 메뉴로 재진입해도 경로점, 주소 검색어·결과·선택 위치, 코스명·설명, 코스 유형·공개 설정과 고도 정보는 초기 상태로 시작합니다. 진행 중인 클라이언트 요청은 취소하며 이전 응답이 새 작성 화면을 갱신하지 않도록 합니다. 이미 서버에서 완료된 저장은 요청 취소로 되돌리지 않습니다.
저장 API 자체에는 요청 식별자 기반 중복 방지가 없으므로 응답이 끊겼다면 내 코스를 먼저 확인합니다.
저장·수정·삭제·공개 범위 변경 성공 후에는 목록 변경을 알립니다. 공개·내 코스·찜 목록으로 복귀하면 보존된 과거 응답 대신 최신 데이터를 조회합니다. 공개 목록에는 공개 상태와 검색 조건을 만족하는 코스만 표시합니다.

## 내 코스 조회

`GET /api/my/courses?page=0&visibility=all&sort=recent`

- `page`: 0~100000. 한 페이지 6개이며, 범위를 넘는 유효 페이지는 마지막 페이지로 보정합니다. 결과가 없으면 page 0입니다.
- `visibility`: `all` / `published` / `private`
- `sort`: `recent` / `views` / `bookmarks`
- 응답: `{ content, stats, page, totalPages }`

`content` 항목은 `id`, `name`, `distanceMeters`, `courseType`, `createdAt`, `region`, `published`, `bookmarkCount`, `viewCount`입니다.
`stats`는 `totalCourses`, `totalDistanceMeters`, `totalViews`, `totalBookmarks`, `publishedCourses`, `privateCourses`입니다.
통계는 선택 필터가 아니라 작성자의 전체 코스를 기준으로 합니다. totalViews에는 현재 공개 코스의 누적 조회수만 포함합니다.

**현재 구현의 불일치:** 서비스의 개수·페이지 계산은 `visibility`를 적용하지만 `OwnedCourseRepository.findAll()`의 목록 SQL은 소유자만 필터링합니다.
따라서 published/private 선택 시 실제 `content`에 다른 공개 범위 코스가 포함될 수 있습니다. 필터가 완전히 동작한다고 전제하면 안 됩니다.

정렬은 최근 ID 내림차순, 공개 조회수 내림차순, 찜 수 내림차순이며 동률은 ID 내림차순입니다.
비공개 코스의 목록 `viewCount`는 0으로 표시하지만 저장된 누적값은 유지합니다.
프론트의 `/my/courses`는 토큰이 없으면 API 호출을 생략하고, 목록 API의 401이면 로그인으로 이동합니다.

`GET /api/my/courses/{id}`는 작성자만 상세를 조회합니다. 응답 필드는 [일반 상세](course-detail.md)와 같습니다.

## 수정·공개 범위·삭제

| 메서드·경로 | 본문 | 성공 |
| --- | --- | --- |
| `PUT /api/my/courses/{id}` | 생성과 같은 전체 요청 형식 | 200 `{ id, distanceMeters }` |
| `PATCH /api/my/courses/{id}/visibility` | `{ "published": true }` 또는 false | 204 |
| `PATCH /api/my/courses/visibility` | `{ "courseIds": [1, 2], "published": false }` | 204 |
| `DELETE /api/my/courses/{id}` | 없음 | 204 |

- 수정·공개 전환·삭제는 작성자만 가능하며 타인 소유와 없는 코스는 404입니다.
- 일괄 공개 범위 변경은 중복 제거 후 양수 ID 1~6개를 허용하며, 일부라도 소유권 검증에 실패하면 전체 트랜잭션을 롤백합니다.
- PUT은 소유 코스를 잠근 뒤 검증·수정합니다. 최종 거리와 지역도 다시 계산합니다.
- 수정의 `published` 생략/null은 기존 공개 여부 유지, 생성의 생략/null은 비공개입니다.
- 작성·수정 화면의 ‘비공개로 저장’ 스위치는 켜짐이 비공개이며 저장 버튼을 누를 때 반영됩니다.
- 비공개 전환 후 기존 찜 사용자의 조회 권한은 유지됩니다. [공개 범위 정책](bookmarks.md)을 참고합니다.
- 공개 코스 조회수 기록은 [상세 문서](course-detail.md)를 참고합니다.

브라우저 변경 경로는 `/api/courses`, `/api/courses/{id}`, `/api/courses/{id}/visibility`, `/api/courses/visibility`이며 Next.js가 `/api/my/courses` 계열로 중계합니다.

## 도보 구간 계산

`POST /api/walking-routes/segment`는 지점 **두 개** 사이의 카카오 도보 경로를 반환합니다. `/api/test/kakao-walking`도 같은 컨트롤러·캐시·한도를 사용합니다.

```json
{
  "points": [
    { "latitude": 37.528, "longitude": 126.934 },
    { "latitude": 37.529, "longitude": 126.935 }
  ],
  "routeMode": "SHORTEST"
}
```

`routeMode`는 `SHORTEST` 기본값, `BROAD_FIRST`, `ACCESSIBLE`을 허용합니다. 좌표는 유한한 WGS84 범위여야 합니다.
응답은 `{ status, distanceMeters, durationSeconds, points, landingUrl }`이며 `points`는 위도·경도 객체 배열입니다.
이 API의 좌표 객체와 저장 GeoJSON의 `[경도, 위도]` 배열 형식을 구분합니다.

- 편집기는 반환된 앞 구간 끝점을 다음 구간 시작점으로 사용하며 순차 계산합니다.
- 동일 요청 입력과 연결 조건의 구간은 재사용하고, 지점 추가 시 새 구간을 계산합니다.
- 백엔드 캐시는 모드·두 입력 좌표가 같은 응답을 기본 900초, 최대 2000개 보관합니다. 동일한 동시 요청은 합칩니다.
- 사용자별 하루 800회, 전체 하루 900회가 기본값입니다. 환경변수가 있으면 해당 값을 우선합니다.
- 캐시 미적중 시 외부 호출 전에 DB 사용량을 예약하므로 실패한 호출도 포함합니다. 자정 기준은 Asia/Seoul이며 서버 재시작으로 사용량이 초기화되지 않습니다.

| 상태 | 의미 |
| --- | --- |
| 400 | 좌표 수·형식·옵션 오류 |
| 401 | 세션 없음·만료 |
| 422 | 카카오가 정상 경로를 찾지 못함 |
| 429 | 우리 서비스의 사용자별·전체 일일 제한 |
| 502 | 외부 비정상 HTTP 응답·통신 실패·표시할 좌표 없음 |
| 503 | 카카오 REST API 키 미설정 |

카카오 HTTP 오류는 현재 502로 변환하며, 아래 429 코드는 우리 서비스의 제한입니다.

```json
{
  "status": 429,
  "code": "GLOBAL_DAILY_LIMIT_EXCEEDED",
  "message": "서비스 전체 일일 한도 초과: 오늘 서비스 전체 도보 경로 요청 900회를 모두 사용했어요. 한국 시간 자정 이후 다시 이용해 주세요.",
  "scope": "GLOBAL",
  "limit": 900,
  "resetsAt": "2026-10-28T00:00:00+09:00"
}
```

개인 한도 초과는 `USER_DAILY_LIMIT_EXCEEDED`, `scope: USER`입니다. 두 한도가 모두 소진된 경우 사용자 한도를 먼저 검사하므로 개인 오류를 반환합니다. 전체 한도 초과로 예약이 실패하면 해당 트랜잭션의 개인 카운터 증가도 롤백합니다.
카카오 계정의 실제 제공량·유료 설정은 별도 콘솔에서 확인하며, 서비스 카운터와 같다고 간주하지 않습니다.

## 출발점 지역 정보

생성·수정 시 Nominatim으로 한국 범위 출발 좌표의 시·도, 시·군·구, 읍·면·동을 추정합니다.
저장 필드는 `region_sido`, `region_sigungu`, `region_eup_myeon_dong`이며 출처·조회 시각은 현재 저장하지 않습니다.
응답 부재·조회 실패에도 저장을 계속하고 지역은 null일 수 있습니다.

`GET /api/regions/reverse?latitude=37.528&longitude=126.934`는 같은 조회기를 사용하며 `{ "region": ... }` 또는 `{ "region": null }`을 반환합니다.
조회기는 서버 메모리 캐시와 단일 프로세스 1.1초 요청 간격을 사용합니다. 여러 인스턴스로 확장할 때는 공용 제한·캐시가 필요합니다.
설정은 `NOMINATIM_REVERSE_URL`, `NOMINATIM_USER_AGENT`입니다.
[Nominatim 역지오코딩 설명](https://nominatim.org/release-docs/latest/api/Reverse/)과 [공개 서버 사용 정책](https://operations.osmfoundation.org/policies/nominatim/)을 참고합니다.

## 검증 방법

`CourseCreateTests`, `OwnedCourseServiceTests`, `CourseRepositoryIntegrationTests`, `AuthOwnershipIntegrationTests`, `WalkingRouteLimitControllerTests`, `WalkingRouteUsageIntegrationTests`에 관련 검증이 있습니다.
실제 DB 테스트는 `RUN_DB_TESTS=true`로 활성화합니다. 테스트 코드의 존재와 이번 문서 수정 중의 실행 결과는 구분합니다.

## 구현 근거

[생성 검증·저장](../../backend/src/main/kotlin/com/runningcourse/course/CourseCreate.kt) · [내 코스 서비스](../../backend/src/main/kotlin/com/runningcourse/course/OwnedCourseService.kt) · [내 코스 SQL](../../backend/src/main/kotlin/com/runningcourse/course/OwnedCourseRepository.kt) · [도보 계산](../../backend/src/main/kotlin/com/runningcourse/course/KakaoWalkingRoute.kt) · [일일 사용량 제한](../../backend/src/main/kotlin/com/runningcourse/course/WalkingRouteUsage.kt)
