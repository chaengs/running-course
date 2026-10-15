# 코스 목록 API

## GET /api/courses
인증 없이 공개된 코스만 ID 오름차순으로 조회합니다.
공간 좌표 추출이 필요한 목록 조회는 JdbcTemplate + PostGIS SQL로 처리합니다.
경로 전체 데이터, 설명, 비공개 코스는 응답에 포함하지 않습니다.
위치/거리 필터는 아직 구현하지 않았습니다. 전체 경로는 [코스 상세 API](course-detail.md)에서 제공합니다.

| 파라미터 | 기본값 | 조건 |
|---|---|---|
| page | 0 | 0 이상인 정수, 0부터 시작 |
| size | 20 | 1~100인 정수 |

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
      "startLocation": { "latitude": 37.528, "longitude": 126.934 }
    },
    {
      "id": 2,
      "name": "[개발용] 여의도 5km 순환",
      "distanceMeters": 4796,
      "courseType": "LOOP",
      "startLocation": { "latitude": 37.529, "longitude": 126.935 }
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
- `totalElements`: 공개된 전체 코스 수. `totalPages`: 해당 size 기준 전체 페이지 수.
- 빈 DB나 마지막 페이지 이후는 HTTP 200과 `content: []`를 반환합니다.
- 전체 공개 코스가 0개이면 `totalElements`, `totalPages` 모두 0입니다.
- 음수 page, 범위 밖 size, 숫자가 아닌 파라미터는 HTTP 400입니다.
- 표준 Spring MVC 오류 응답을 사용하며 별도 오류 응답 형식은 아직 정의하지 않았습니다.

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
