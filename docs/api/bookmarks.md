# 코스 찜

로그인한 사용자가 공개 코스를 북마크합니다. 본인의 공개 코스도 북마크할 수 있습니다.
모든 API는 `Authorization: Bearer <session token>`이 필요하며, 사용자 ID는 세션에서 결정합니다.

| 메서드 | 경로 | 응답 |
| --- | --- | --- |
| GET | `/api/my/bookmarks?page=0` | 200 `{ "content": [...], "page": 0, "hasNext": false }` |
| GET | `/api/my/bookmarks/{courseId}` | 200 `{ "bookmarked": true }` 또는 false |
| PUT | `/api/my/bookmarks/{courseId}` | 204, 북마크 추가 |
| DELETE | `/api/my/bookmarks/{courseId}` | 204, 북마크 해제 |

- 미로그인은 401입니다. PUT은 공개 코스에만 가능하며 비공개 또는 없는 코스는 동일하게 404입니다.
- GET 상태 조회는 본인의 찜 여부만 반환합니다. 코스가 비공개로 바뀌어도 기존 찜 상태를 확인하고 해제할 수 있습니다.
- PUT과 DELETE는 반복해도 결과가 같습니다. `(user_id, course_id)` 기본 키가 중복 저장을 막습니다.
- 해제는 코스가 비공개로 바뀌거나 삭제된 뒤에도 204입니다. 다른 사용자의 북마크에는 영향을 주지 않습니다.
- 코스나 사용자가 삭제되면 관련 북마크도 FK의 `ON DELETE CASCADE`로 삭제됩니다.
- 비공개 전환 시 기존 찜 행은 유지되며 찜 목록에도 계속 표시됩니다. 해당 사용자와 작성자만 상세 및 경로 미리보기를 확인할 수 있고, 찜 해제 후에는 작성자가 다시 공개할 때까지 코스에 접근할 수 없습니다.
- 찜 추가는 코스를 `FOR SHARE`로 잠가 공개 범위 변경·삭제와의 경쟁을 제어합니다.
- 브라우저는 Next.js의 `/api/bookmarks/{courseId}` PUT/DELETE를 사용합니다. HttpOnly 쿠키를 서버에서 전달하며 Origin을 검증합니다.

목록은 로그인한 사용자의 찜 코스를 공개 범위와 관계없이 반환합니다. 코스 ID·이름·거리·유형·공개 여부만 반환하며 GeoJSON은 조회하지 않습니다. 최근 찜 순(`created_at DESC, course_id DESC`)으로 20개씩 반환합니다. page는 0~100000이며 잘못된 값은 400입니다. 21개를 조회해 다음 페이지 존재 여부를 판단합니다.

프론트엔드 `/my/bookmarks`는 서버에서 목록을 조회하며, 상단 사용자 메뉴의 '북마크'로 진입합니다. 목록의 북마크 해제 성공 시 서버 목록을 다시 조회합니다. 비로그인 사용자는 로그인 화면으로 이동하고, 빈 목록·로딩·오류 재시도를 제공합니다.

백엔드를 재시작하면 Flyway가 `V3__create_course_bookmarks.sql`을 적용합니다.
