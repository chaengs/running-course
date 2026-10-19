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

`GET /api/my/courses`는 내 코스 최신 100개를 반환합니다.
`GET /api/my/courses/{id}`는 작성자만 상세를 조회합니다.
`PUT /api/my/courses/{id}`는 같은 요청 형식으로 수정하고 최종 거리를 재계산합니다. `published`를 보내면 코스 내용과 공개 범위를 같은 SQL·트랜잭션으로 저장합니다. 생략하거나 null이면 기존 공개 여부를 유지합니다. 생성 시 생략/null은 비공개입니다.
`PATCH /api/my/courses/{id}/visibility`는 `{ "published": true }` 또는 false로 전환합니다.
`DELETE /api/my/courses/{id}`는 작성자의 코스를 영구 삭제합니다.
수정 성공은 200, 공개 전환·삭제 성공은 204입니다. 타인 소유 및 없는 코스는 모두 404입니다.
공개 코스 GET은 그대로 `/api/courses/{id}`이며 비공개/삭제된 코스는 공유 URL로도 열 수 없습니다.

작성·수정 화면은 동일한 '비공개로 저장' 스위치를 사용합니다. 켜짐은 비공개, 꺼짐은 공개입니다. 생성 시 켜짐이 기본값이며 수정 시 저장된 공개 여부를 불러옵니다. 토글 변경은 저장 버튼을 누를 때 반영됩니다.
