# 사용자 코스 저장

`POST /api/my/courses`는 로그인 사용자 소유의 닫힌 GeoJSON LineString을 선택한 공개 범위로 저장합니다. 기본값은 비공개입니다.
`Authorization: Bearer <로그인 세션 토큰>`을 요구하며 관리자 키 API는 제거했습니다.
브라우저는 `/api/courses`로 요청하고 Next.js가 HttpOnly 쿠키를 읽어 백엔드에 전달합니다.
작성자 ID는 세션에서 결정합니다. 공개 여부는 `published`로 선택합니다.
로그인·세션 및 공개 범위는 [사용자 인증 API](auth.md)를 참고하세요.

본문은 `name`, `description`, `courseType`(LOOP/OUT_AND_BACK), 선택 항목 `published`(boolean),
`routeGeojson`(`type: LineString`, `coordinates: [[경도, 위도], ...]`)입니다.
이름 1~100자, 소개 5000자 이하, 좌표 4~10000개, 서로 다른 지점 3개 이상,
시작·끝 좌표 일치, 유효한 WGS84 좌표를 검증합니다.
PostGIS geography 길이를 반올림한 1m~100km만 허용합니다.
시작점과 거리는 서버에서 계산하며 클라이언트 거리 값을 사용하지 않습니다.

성공은 201, 본문 `{ "id": 123, "distanceMeters": 5010 }`,
Location은 `/api/courses/123`입니다. 프론트엔드는 같은 출처의 Next.js API 경유로 요청합니다.
저장 중 중복 클릭을 막고 성공 후 상세 링크를 제공합니다.
통신이 끊긴 경우 저장이 완료됐을 수도 있으므로 목록을 확인한 후 재시도하세요.
DB 변경은 트랜잭션으로 수행합니다. 현재 경로 자체의 보행 가능 여부는 검증하지 않습니다.

`GET /api/my/courses?page=0&visibility=all&sort=recent`는 `{ content, stats, page, totalPages }`를 반환합니다. 코스 목록은 한 페이지에 최대 6개이며 `visibility`는 `all`/`published`/`private`, `sort`는 `recent`/`views`/`bookmarks`입니다. `content` 각 코스는 `courseType`, `createdAt`, `bookmarkCount`, `viewCount`를 포함하고, `stats`는 전체 코스 수·공개/비공개 수·전체 거리·공개 코스 누적 조회수·전체 북마크 수를 집계합니다.
`GET /api/my/courses/{id}`는 작성자만 상세를 조회합니다.
상세 화면을 연 횟수는 공개 코스의 `POST /api/courses/{id}/view` 또는 작성자의 `POST /api/my/courses/{id}/view`에서 기록합니다. 공개 상태인 코스의 조회만 합계에 포함하며, 비공개 코스를 작성자가 열어도 조회수를 올리지 않습니다. 공개 코스를 비공개로 전환하면 기존 조회수는 코스 데이터에 보존되지만 공개 반응 지표와 목록 표시에서는 제외되고, 다시 공개하면 누적 조회수가 표시됩니다. 미리보기 지도와 목록 조회는 조회수에 포함하지 않습니다.
코스 생성 또는 경로 수정 시 대한민국 출발 좌표를 Nominatim 역지오코딩으로 조회해 시·도, 시·군·구, 읍·면·동과 출처·조회 시각을 저장합니다. 지역 정보가 반환되지 않거나 외부 요청에 실패해도 코스 저장은 계속되며 지역 필드는 비어 있을 수 있습니다. 기존 코스는 수정할 때 지역 정보가 채워집니다. Nominatim은 좌표를 포함하는 가장 가까운 검색 가능 OSM 객체를 기준으로 주소를 추정하므로 실제 행정 경계와 다를 수 있습니다. [Nominatim 역지오코딩 방식](https://nominatim.org/release-docs/latest/api/Reverse/)
공개 Nominatim 연결 주소와 식별 User-Agent는 `NOMINATIM_REVERSE_URL`, `NOMINATIM_USER_AGENT` 환경 변수로 바꿀 수 있습니다. 클라이언트는 좌표 결과를 메모리 캐시하고 단일 백엔드 인스턴스에서 초당 1회 이하로 요청을 제한합니다. 여러 인스턴스로 확장할 때는 공용 캐시와 제한기를 두어야 합니다. OSM 기여자 출처 표기를 유지하고 공개 서버의 [사용 정책](https://operations.osmfoundation.org/policies/nominatim/)을 따라야 합니다.
`PUT /api/my/courses/{id}`는 같은 요청 형식으로 수정하고 최종 거리를 재계산합니다. `published`를 보내면 코스 내용과 공개 범위를 같은 SQL·트랜잭션으로 저장합니다. 생략하거나 null이면 기존 공개 여부를 유지합니다. 생성 시 생략/null은 비공개입니다.
`PATCH /api/my/courses/{id}/visibility`는 `{ "published": true }` 또는 false로 전환합니다.
`DELETE /api/my/courses/{id}`는 작성자의 코스를 영구 삭제합니다.
수정 성공은 200, 공개 전환·삭제 성공은 204입니다. 타인 소유 및 없는 코스는 모두 404입니다.
공개 코스 GET은 그대로 `/api/courses/{id}`이며 비공개/삭제된 코스는 공유 URL로도 열 수 없습니다.

작성·수정 화면은 동일한 '비공개로 저장' 스위치를 사용합니다. 켜짐은 비공개, 꺼짐은 공개입니다. 생성 시 켜짐이 기본값이며 수정 시 저장된 공개 여부를 불러옵니다. 토글 변경은 저장 버튼을 누를 때 반영됩니다.
