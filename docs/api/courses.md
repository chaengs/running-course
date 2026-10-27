# 공개 코스 목록·검색 API

현재 코드 대조일: 2026-10-27. 아래 경로는 별도 표기가 없으면 Kotlin 백엔드 기준입니다.
인증 없이 공개 코스만 조회합니다. 유효한 Bearer 세션이 있으면 해당 사용자의 찜 상태를 포함합니다.
비공개 코스·설명·전체 경로는 목록에 포함하지 않습니다.

## 목록 API 두 가지

| 경로 | 응답 페이지 필드 | 용도 |
| --- | --- | --- |
| `GET /api/courses/feed` | `page`, `size`, `hasNext` | 현재 홈 무한 스크롤 |
| `GET /api/courses` | `page`, `size`, `totalElements`, `totalPages` | 전체 개수가 필요한 기존 계약 |

두 API의 검색 조건·정렬·코스 요약 필드는 같습니다.
feed는 `size + 1`개를 조회해 최대 `size`개만 반환하고 다음 페이지 여부를 판단합니다. `COUNT(*)`는 실행하지 않습니다.
기존 목록은 전체 개수와 목록을 `REPEATABLE_READ` 트랜잭션의 같은 스냅샷에서 조회합니다.

## 파라미터

| 이름 | 기본값 | 조건 |
| --- | --- | --- |
| `page` | 0 | 0~2147483647 정수, 0부터 시작 |
| `size` | 20 | 1~100 정수 |
| `latitude` | 없음 | -90~90의 유한한 수, longitude와 함께 지정 |
| `longitude` | 없음 | -180~180의 유한한 수, latitude와 함께 지정 |
| `radiusMeters` | 위치가 있으면 2000 | 1~50000 정수(m), 위치 없이 지정 불가 |
| `targetDistanceMeters` | 없음 | 3000 / 5000 / 10000 중 하나(m), 아래 고정 구간으로 검색 |
| `minimumDistanceMeters` | 없음 | 1~100000 정수(m), 해당 길이 이상 |

`targetDistanceMeters`와 `minimumDistanceMeters`는 동시에 지정할 수 없습니다.

## feed 응답 예시

```json
{
  "content": [
    {
      "id": 1,
      "name": "한강 5km 코스",
      "distanceMeters": 5010,
      "courseType": "LOOP",
      "startLocation": { "latitude": 37.528, "longitude": 126.934 },
      "distanceToStartMeters": null,
      "region": { "sido": "서울특별시", "sigungu": "영등포구", "eupMyeonDong": "여의동" },
      "elevationDifficulty": "LOW",
      "isBookmarked": false
    }
  ],
  "page": 0,
  "size": 6,
  "hasNext": false
}
```

- `courseType`: `LOOP`(순환형), `OUT_AND_BACK`(왕복형).
- `distanceMeters`: 저장된 코스 전체 길이(m).
- `distanceToStartMeters`: 검색 위치에서 출발점까지의 직선거리(m, 소수). 위치 미지정 시 null입니다.
- `region`: 시·도/시·군·구/읍·면·동. 전체 또는 개별 항목이 null일 수 있습니다.
- `elevationDifficulty`: 저장 고도 프로필의 `LOW`/`MEDIUM`/`HIGH`, 미저장 시 null입니다.
- `isBookmarked`: 요청 사용자 기준 찜 여부. 미로그인 또는 유효하지 않은 세션이면 false입니다.
- 빈 결과와 마지막 페이지 이후도 HTTP 200, `content: []`입니다. feed의 `hasNext`는 false입니다.

기존 `GET /api/courses`는 같은 `content`에 `hasNext` 대신 `totalElements`, `totalPages`를 반환합니다.
검색 결과가 0개면 두 전체 값 모두 0입니다.

## 검색 의미와 예시

```sh
curl 'http://localhost:8080/api/courses/feed?page=0&size=6'
curl 'http://localhost:8080/api/courses/feed?latitude=37.528&longitude=126.934&radiusMeters=2000&targetDistanceMeters=5000'
curl 'http://localhost:8080/api/courses/feed?minimumDistanceMeters=11001'
curl 'http://localhost:8080/api/courses?targetDistanceMeters=5000&page=1&size=20'
```

- 위치가 없으면 ID 오름차순, 있으면 출발점 거리 오름차순·동률 ID 오름차순입니다.
- 주변 조건은 PostGIS geography의 `ST_DWithin`으로 **출발점**이 반경 안에 있는지 판단하며 경계를 포함합니다.
- 경로 일부가 근처를 지나는 조건이나 출발점까지의 도보 거리가 아닙니다. 거리 계산·정렬은 `ST_Distance`입니다.
- 목표 거리는 임의 거리의 오차율이 아닌 아래 고정 구간입니다. 지원하지 않는 목표 값(예: 5001)은 400입니다.

| 화면 선택 | 요청 | 저장된 정수 m 범위 |
| --- | --- | --- |
| 3km | `targetDistanceMeters=3000` | 1~4000 |
| 5km | `targetDistanceMeters=5000` | 4001~7000 |
| 10km | `targetDistanceMeters=10000` | 7001~11000 |
| 그 이상 | `minimumDistanceMeters=11001` | 11001 이상 |

- 4000m는 3km, 7000m는 5km, 11000m는 10km 구간에만 포함되어 중복·누락이 없습니다.
- 백엔드의 최소 거리 파라미터는 여전히 1~100000m의 임의 하한을 지원합니다. 화면의 ‘그 이상’은 11001m를 사용합니다.
- Next.js 목록 URL 파서는 세 목표값과 최소값 11001만 허용합니다. 기존 10km 초과 링크(`minimumDistanceMeters=10001`)나 임의 목표 링크는 현재 화면에서 유효한 필터가 아니며 홈은 조건 없는 주소로 이동하고 목록 중계는 400을 반환합니다.
- 위치와 거리 조건을 함께 지정하면 모두 충족해야 합니다.
- 공간 인덱스가 존재해도 특정 쿼리의 실제 인덱스 사용·성능은 실행 계획으로 별도 확인해야 합니다.

## 오류와 프론트 연결

- 잘못된 페이지·크기·숫자 형식·범위·검색 조건 조합은 HTTP 400입니다.
- 검색 조합 오류는 `application/problem+json`의 `detail`에 이유를 반환합니다. 숫자 변환·검증 오류는 Spring MVC 오류 응답을 사용합니다.
- 홈 첫 페이지는 Next.js 서버가 feed를 직접 조회합니다. 이후 브라우저의 `GET /api/courses`는 Next.js 중계 경로이며 **백엔드 feed 응답**을 반환합니다.
- 프론트 목록 크기는 6개이며, 같은 중계 요청에 임의의 `size`를 보내도 프론트 파서는 6으로 정규화합니다.
- 검색 조건은 URL에 보관합니다. 주소·장소 검색과 위치 권한 처리는 이 목록 API의 역할이 아닙니다.
- 개인 찜 상태를 포함하므로 현재 프론트 조회는 `no-store`입니다.
- feed 로그의 `auth_ms`, `service_ms`, `query_ms`, `total_ms`는 서버 내부 측정값이며 사용자 브라우저의 전체 응답 시간과 다릅니다.

전체 경로와 미리보기는 [상세 API](course-detail.md), 로그인 계약은 [인증 문서](auth.md)를 참고합니다.

## 검증 방법

```sh
cd backend
./gradlew test --tests '*CourseControllerTests' --tests '*CourseSearchControllerTests' --tests '*CourseServiceTests'
RUN_DB_TESTS=true ./gradlew test --rerun-tasks --tests '*CourseRepositoryIntegrationTests'
```

실제 DB 테스트는 로컬 PostGIS DB와 초기 마이그레이션을 준비한 뒤 실행합니다. 명령은 실행 방법이며 이 문서 편집 중 새로 수행한 테스트 결과를 뜻하지 않습니다.

## 구현 근거

[목록 컨트롤러](../../backend/src/main/kotlin/com/runningcourse/course/CourseController.kt) · [조회·페이지 처리](../../backend/src/main/kotlin/com/runningcourse/course/CourseService.kt) · [검색 조건](../../backend/src/main/kotlin/com/runningcourse/course/CourseSearch.kt)
