# 코스 상세·경로 미리보기 API

현재 코드 대조일: 2026-10-27. 아래는 Kotlin 백엔드 경로입니다.

## 조회 권한

`GET /api/courses/{id}`와 `GET /api/courses/{id}/preview`는 같은 가시성 조건을 사용합니다.

- 공개 코스: 누구나 조회 가능
- 비공개 코스: 유효한 세션의 작성자 또는 기존 찜 사용자만 조회 가능
- 없는 코스·권한 없는 코스: 같은 404

`Authorization: Bearer <session token>`은 선택 사항입니다. 토큰이 없거나 유효하지 않으면 익명으로 조회하므로 공개 코스는 볼 수 있습니다.
`id`는 1~9223372036854775807의 Long 정수입니다. 잘못된 숫자·범위는 400입니다.
작성자 전용 `GET /api/my/courses/{id}`는 별도로 존재하며 인증이 필수입니다.

## GET /api/courses/{id}

| 필드 | 의미 |
| --- | --- |
| `id`, `name`, `description` | 코스 ID·이름·설명, 빈 설명은 빈 문자열 |
| `distanceMeters` | 서버에서 계산해 저장한 전체 코스 길이(m) |
| `courseType` | `LOOP`(순환형) / `OUT_AND_BACK`(왕복형) |
| `startLocation` | `{ latitude, longitude }` |
| `routeGeojson` | 실제 전체 경로의 GeoJSON LineString 객체 |
| `routeWaypoints` | 편집용 지점의 GeoJSON LineString 객체, 기존 데이터는 null 가능 |
| `ownerId` | 작성자 ID, 소유자 없는 기존 데이터는 null 가능 |
| `published` | 코스에 저장된 공개 여부. 요청자에 따라 바뀌는 값이 아님 |
| `region` | `{ sido, sigungu, eupMyeonDong }` 또는 null |
| `elevationProfile` | 저장된 고도 프로필 또는 null |
| `bookmarkCount` | 코스를 찜한 사용자 수 |
| `isBookmarked` | 현재 요청 사용자의 찜 여부, 익명은 false |

```json
{
  "id": 1,
  "name": "예시 러닝 코스",
  "description": "한강 주변을 달리는 코스입니다.",
  "distanceMeters": 284,
  "courseType": "LOOP",
  "startLocation": { "latitude": 37.528, "longitude": 126.934 },
  "routeGeojson": {
    "type": "LineString",
    "coordinates": [[126.934, 37.528], [126.935, 37.528], [126.935, 37.529], [126.934, 37.528]]
  },
  "routeWaypoints": null,
  "ownerId": 7,
  "published": true,
  "region": null,
  "elevationProfile": null,
  "bookmarkCount": 2,
  "isBookmarked": false
}
```

수치는 형식 설명용입니다. GeoJSON은 문자열이 아닌 JSON 객체이고 좌표 순서는 **[경도, 위도]**입니다.
`distanceMeters`와 고도 프로필 내부 거리는 계산 방식이 달라 약간 다를 수 있습니다.
고도 계약은 [고도 API](elevation.md), 공개 범위 변경 후 찜 권한은 [찜 문서](bookmarks.md)를 참고합니다.

## GET /api/courses/{id}/preview

상세의 권한 조건으로 **경로 데이터만** 조회합니다. 설명·고도·찜 수를 읽거나 반환하지 않습니다.
응답 본문은 래퍼 없이 GeoJSON 객체입니다.

```json
{
  "type": "LineString",
  "coordinates": [[126.934, 37.528], [126.935, 37.528], [126.935, 37.529], [126.934, 37.528]]
}
```

현재는 경로 좌표를 단순화하지 않으므로 전체 경로와 같은 좌표 수입니다.
브라우저의 같은 경로는 Next.js가 세션을 전달해 이 백엔드 API로 중계합니다. 권한 없는 비공개 코스도 404입니다.

## 조회수

- `POST /api/courses/{id}/view`: 공개 코스 조회수 증가, 성공 204. 미공개·없는 코스는 404.
- `POST /api/my/courses/{id}/view`: 인증된 작성자 코스의 조회 처리. 공개일 때만 증가하며 비공개 열람은 증가시키지 않습니다.
- 상세 화면은 응답 후 `after()`로 기록합니다. 기록 실패 때문에 상세 조회를 실패시키지 않습니다.
- 목록·미리보기 API 자체는 조회수를 증가시키지 않습니다. 중복 열람·봇을 제외하는 고유 방문자 지표는 아닙니다.

## 화면·검색 공유

- 상세 화면은 공개·작성자·기존 찜 권한을 처리하는 일반 상세 API 한 번으로 데이터를 가져옵니다.
- 요청 단위 React.cache로 메타데이터와 화면의 상세 조회를 공유하며 사용자 간 장기 캐시로 공유하지 않습니다.
- 공개 코스의 OG 제목은 `{코스 명}| | Running Course`, 설명은 코스 설명 앞 15자이며 초과 시 `…`를 붙입니다. 결합 이모지도 중간에 자르지 않습니다.
- 검색용 제목·설명은 OG와 별도로 생성하며, canonical은 검색 조건 없는 `/courses/{id}`입니다.
- 비공개 코스는 noindex이고 이름·설명을 공유 메타데이터에 넣지 않습니다. 공개 사이트맵에도 포함하지 않습니다.

## 오류와 검증

404는 `application/problem+json`이며 `detail`은 `코스를 찾을 수 없습니다.`입니다.
인증이 필요한 변경 요청과 익명 공개 조회의 상태 코드를 혼동하지 않습니다.

```sh
cd backend
./gradlew test --tests '*CourseDetailControllerTests' --tests '*CourseControllerTests' --tests '*CourseServiceTests'
RUN_DB_TESTS=true ./gradlew test --rerun-tasks --tests '*CourseRepositoryIntegrationTests'
```

위는 회귀 검증 실행 방법입니다. 외부 경로 품질·실제 배포 속도·검색엔진 수집 완료를 보장하지 않습니다.

## 구현 근거

[상세 응답 모델](../../backend/src/main/kotlin/com/runningcourse/course/CourseDetail.kt) · [상세·미리보기 SQL](../../backend/src/main/kotlin/com/runningcourse/course/CourseRepository.kt) · [화면·공유 메타데이터](../../frontend/src/app/courses/[id]/page.tsx)
