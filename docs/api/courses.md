# 코스 목록 API

## GET /api/courses
인증 없이 공개된 코스만 조회합니다. 위치를 지정하면 출발점까지 가까운 순, 없으면 ID 오름차순입니다.
공간 좌표 추출이 필요한 목록 조회는 JdbcTemplate + PostGIS SQL로 처리합니다.
경로 전체 데이터, 설명, 비공개 코스는 응답에 포함하지 않습니다.
주변 검색과 목표 거리 필터를 지원합니다. 전체 경로는 [코스 상세 API](course-detail.md)에서 제공합니다.

| 파라미터 | 기본값 | 조건 |
|---|---|---|
| page | 0 | 0 이상인 정수, 0부터 시작 |
| size | 20 | 1~100인 정수 |
| latitude | 없음 | -90~90의 유한한 숫자. longitude와 함께 입력 |
| longitude | 없음 | -180~180의 유한한 숫자. latitude와 함께 입력 |
| radiusMeters | 위치가 있으면 2000 | 1~50000인 정수(m). 위치 없이 단독 지정 불가 |
| targetDistanceMeters | 없음 | 1~100000인 정수(m). 목표 길이의 ±10%로 검색 |

```sh
curl 'http://localhost:8080/api/courses?page=0&size=2'
```

응답 예시 (ID와 개수는 DB 내용에 따라 달라집니다):

```json
{
  "content": [
    {
      "id": 1,
      "name": "[개발용] 여의도 3km 순환",
      "distanceMeters": 2997,
      "courseType": "LOOP",
      "startLocation": { "latitude": 37.528, "longitude": 126.934 },
      "distanceToStartMeters": null
    },
    {
      "id": 2,
      "name": "[개발용] 여의도 5km 순환",
      "distanceMeters": 4796,
      "courseType": "LOOP",
      "startLocation": { "latitude": 37.529, "longitude": 126.935 },
      "distanceToStartMeters": null
    }
  ],
  "page": 0,
  "size": 2,
  "totalElements": 4,
  "totalPages": 2
}
```

- `courseType`: `LOOP`(순환형), `OUT_AND_BACK`(왕복형).
- `distanceMeters`: 코스의 총 길이. 출발점까지의 거리가 아닙니다.
- `distanceToStartMeters`: 검색 위치부터 코스 출발점까지의 직선거리(m, 소수). 위치를 지정하지 않으면 `null`입니다. 도보 이동거리나 코스 길이와 다릅니다.
- `totalElements`: 모든 검색 조건을 만족하는 공개 코스 수. `totalPages`: 해당 size 기준 전체 페이지 수.
- 빈 DB나 마지막 페이지 이후는 HTTP 200과 `content: []`를 반환합니다.
- 전체 공개 코스가 0개이면 `totalElements`, `totalPages` 모두 0입니다.
- 음수 page, 범위 밖 size, 숫자가 아닌 파라미터는 HTTP 400입니다.
- 검색 조건의 조합/범위 오류는 `application/problem+json`의 HTTP 400 응답이며, `detail`에 이유를 반환합니다. 파라미터 숫자 변환이나 페이지 검증 실패는 기존 Spring MVC 오류 응답입니다.

## 검색 예시

```sh
# 위치 + 반경 + 목표 거리
curl 'http://localhost:8080/api/courses?latitude=37.528&longitude=126.934&radiusMeters=2000&targetDistanceMeters=5000'

# 위치만 지정하면 기본 반경 2km (목표 길이 제한 없음)
curl 'http://localhost:8080/api/courses?latitude=37.528&longitude=126.934'

# 위치 없이 목표 길이만 필터링
curl 'http://localhost:8080/api/courses?targetDistanceMeters=10000'

# 같은 검색 조건으로 두 번째 페이지 조회
curl 'http://localhost:8080/api/courses?latitude=37.528&longitude=126.934&targetDistanceMeters=5000&page=1&size=1'
```

- 주변 검색은 PostGIS `geography`와 `ST_DWithin`을 사용하며 검색 반경 경계를 포함합니다.
- 코스 출발점이 반경 안에 있어야 합니다. 경로의 일부분만 반경에 들어오는 조건이 아닙니다.
- 위치 검색 정렬은 출발점까지 거리 오름차순, 같은 거리이면 ID 오름차순입니다.
- 목표 5,000m는 4,500~5,500m를 양끝 포함하여 조회합니다.
  DB 길이는 정수 m이므로 목표 5,001m는 4,501~5,501m를 조회합니다.
- 반경과 목표 거리를 함께 지정하면 두 조건 모두 충족해야 합니다.
- 목록과 전체 개수에 같은 필터를 적용하며 같은 트랜잭션의 스냅샷을 사용합니다.
- 검색 조건 생략 시 기존 전체 공개 목록과 페이지 동작을 유지합니다.
- 위도/경도 중 하나만 입력, 위치 없이 반경만 입력, 범위 초과,
  NaN/Infinity 또는 숫자가 아닌 값은 HTTP 400입니다.
- 주소 검색/위치 권한 요청은 이 API에서 처리하지 않습니다. 프론트엔드가 선택한 좌표를 전달합니다.

검색 조건 오류 예시:

```json
{
  "type": "about:blank",
  "title": "Bad Request",
  "status": 400,
  "detail": "위도와 경도를 함께 입력해 주세요.",
  "instance": "/api/courses"
}
```

## 테스트

```sh
cd backend
./gradlew test
```

실제 DB 테스트도 실행하려면 PostGIS DB와 Flyway 초기 테이블을 먼저 준비하세요.

```sh
RUN_DB_TESTS=true ./gradlew test --rerun-tasks
```

DB 주소/계정은 백엔드와 동일한 `DATABASE_URL`, `DATABASE_USERNAME`, `DATABASE_PASSWORD`를 사용합니다.
DB 테스트는 세션 전용 임시 테이블을 만들고 연결 종료 시 제거하므로 기존 코스 데이터를 변경하지 않습니다.
샘플 코스 5개가 등록된 개발 DB의 기본 목록은 공개 코스 4개를 반환합니다.

## 개발 샘플 기대 결과
| 검색 | 결과 |
|---|---|
| 조건 없음 | 공개 코스 4개, 출발점까지 거리는 null |
| 여의도 (37.528, 126.934), 반경 2km | 여의도 코스 3개 |
| 위 조건 + 목표 5km | 약 4.8km·5.2km 코스 2개 |
| 여의도 반경 100m + 목표 5km | 0개 |
| 위치 없이 목표 10km | 상암 코스 1개 |

프론트엔드 검색 폼과 URL 조건 연결은 후속 구현입니다.
