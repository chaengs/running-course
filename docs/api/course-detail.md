# 코스 상세 API

## GET /api/courses/{id}
인증 없이 공개된 코스의 상세 정보를 조회합니다.

| 파라미터 | 위치 | 조건 |
|---|---|---|
| id | URL 경로 | 1 이상인 Long 정수 (최대 9223372036854775807) |

```sh
curl 'http://localhost:8080/api/courses/1'
```

응답 필드:

| 필드 | 설명 |
|---|---|
| id / name | 코스 ID / 이름 |
| description | 코스 설명 |
| distanceMeters | 코스 전체 길이(m). 출발점까지 거리가 아닙니다. |
| courseType | LOOP(순환형) / OUT_AND_BACK(왕복형) |
| startLocation | latitude(위도), longitude(경도) 객체 |
| routeGeojson | 전체 경로의 GeoJSON LineString geometry 객체 |

예시 응답 (형식 설명용):

```json
{
  "id": 1,
  "name": "예시 러닝 코스",
  "description": "코스 설명 예시입니다.",
  "distanceMeters": 284,
  "courseType": "OUT_AND_BACK",
  "startLocation": { "latitude": 37.528, "longitude": 126.934 },
  "routeGeojson": {
    "type": "LineString",
    "coordinates": [[126.934, 37.528], [126.935, 37.529], [126.934, 37.528]]
  }
}
```

- GeoJSON은 문자열이 아닌 JSON 객체이며 좌표는 **[경도, 위도]** 순서입니다.
- 경로의 처음과 마지막 좌표가 출발·도착점입니다. V1의 등록 코스는 두 지점이 일치합니다.
- 빈 설명은 빈 문자열입니다. 공개 상태나 내부 관리 필드는 반환하지 않습니다.

## 상태 코드
- `200`: 공개 코스 상세.
- `400`: 0 이하, 숫자가 아닌 ID, Long 범위 초과. 기존 Spring MVC 오류 응답을 사용합니다.
- `404`: 없는 코스와 비공개 코스 모두 같은 메시지를 반환합니다.

404는 `application/problem+json` 형식입니다.

```json
{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "코스를 찾을 수 없습니다.",
  "instance": "/api/courses/99"
}
```

## 검증
```sh
cd backend
./gradlew test
RUN_DB_TESTS=true ./gradlew test --rerun-tasks
```

Controller의 JSON·ID 검증·404 응답, Service의 상세 조회·예외 처리,
실제 PostGIS Repository의 설명·좌표·전체 경로 매핑과 비공개 조회 차단을 검증합니다.
DB 테스트는 기존 코스를 변경하지 않는 세션 전용 임시 테이블을 사용합니다.
