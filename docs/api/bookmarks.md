# 코스 찜과 공개 범위 정책

현재 코드 대조일: 2026-10-27. 아래 API는 Kotlin 백엔드 기준이며 모두 Bearer 세션 인증이 필요합니다.
사용자 ID는 세션에서 결정합니다. 본인의 공개 코스도 찜할 수 있습니다.

## API

| 메서드·경로 | 응답 |
| --- | --- |
| `GET /api/my/bookmarks?page=0` | 200 `{ content, page, hasNext }` |
| `GET /api/my/bookmarks/{courseId}` | 200 `{ "bookmarked": true }` 또는 false |
| `PUT /api/my/bookmarks/{courseId}` | 204, 공개 코스 찜 |
| `DELETE /api/my/bookmarks/{courseId}` | 204, 본인의 찜 해제 |

미로그인·만료 세션은 401입니다. 추가 대상이 비공개이거나 없으면 같은 404를 반환합니다.
상태 조회는 본인의 찜 여부만 반환하며, 비공개 전환 뒤에도 기존 상태를 확인할 수 있습니다.
해제는 코스가 비공개로 바뀌거나 삭제된 뒤에도 204이며 다른 사용자의 찜에 영향을 주지 않습니다.

## 목록

`page`는 0~100000 정수이며 잘못된 값은 400입니다. 크기는 고정 20개이고 최근 찜 순(`created_at DESC, course_id DESC`)입니다.
21개를 조회해 최대 20개를 반환하며 `hasNext`를 결정합니다. 전체 개수 조회는 하지 않습니다.
페이지를 자동 보정하지 않으므로 마지막 이후는 빈 content, hasNext false입니다.

```json
{
  "content": [
    {
      "id": 1,
      "name": "한강 코스",
      "distanceMeters": 5000,
      "courseType": "LOOP",
      "region": null,
      "elevationDifficulty": "LOW",
      "published": false,
      "isBookmarked": true
    }
  ],
  "page": 0,
  "hasNext": false
}
```

`region`은 지역 객체 또는 null, `elevationDifficulty`는 저장된 고도 등급 또는 null입니다.
목록에는 전체 경로·고도 프로필·설명을 포함하지 않습니다. 카드 지도는 별도 [경로 미리보기 API](course-detail.md)를 사용합니다.

## 비공개 전환 정책

| 상황 | 동작 |
| --- | --- |
| 공개 코스에 새 찜 | 가능 |
| 비공개 코스에 새 찜 | 불가, 404 |
| 찜한 코스가 비공개로 전환 | 기존 찜과 목록 표시 유지 |
| 기존 찜 사용자가 비공개 상세·미리보기 조회 | 가능 |
| 기존 찜 사용자가 해당 코스 수정·삭제 | 불가, 작성자만 가능 |
| 비공개 코스 찜 해제 | 가능. 작성자가 아니면 이후 상세 접근 불가 |
| 코스·사용자 삭제 | FK ON DELETE CASCADE로 관련 찜 제거 |

비공개는 공개 검색·신규 접근을 막지만 기존 찜 사용자의 열람은 유지하는 정책입니다.
작성자는 비공개 전환 확인 안내에서 이를 확인합니다.

## 저장·동시성

- `(user_id, course_id)` 복합 기본 키와 `ON CONFLICT DO NOTHING`으로 중복 추가를 막습니다.
- 추가·해제를 반복해도 같은 최종 상태이며 중복 해제는 성공합니다.
- 추가는 트랜잭션 안에서 공개 코스를 `FOR SHARE`로 잠근 뒤 저장해 공개 범위 변경·삭제와의 경쟁을 제어합니다.
- FK는 참조 무결성, 공개 여부 확인·행 잠금은 찜 허용 정책을 담당합니다.
- 실제 동시성 성질은 독립 트랜잭션과 제어된 실행 순서로 검증해야 하며 단순 반복 요청과 구분합니다.

## 프론트 연결

- 사용자 메뉴에서 `/my/bookmarks`로 진입합니다.
- 화면 서버 함수는 세션 쿠키에 토큰이 없으면 목록 API를 호출하지 않고 `/login`으로 이동합니다.
- 토큰이 있으면 목록 API만 호출하며 401이면 로그인으로 이동하고, 다른 오류는 조회 실패로 처리합니다. 화면 자체는 별도 `/api/auth/me`를 기다리지 않습니다.
- 공통 헤더가 사용자 정보를 표시하는 인증 조회는 별도입니다.
- 브라우저의 찜 변경은 Next.js `/api/bookmarks/{courseId}` PUT/DELETE이며 Origin과 세션 쿠키를 검사합니다.
- 찜 변경 성공 후 현재 목록을 갱신하고, 상세에서 변경한 뒤 뒤로가기로 복귀한 목록도 재조회합니다. 공개 목록의 카드 하트와 찜 목록의 포함 여부에 모두 반영합니다. 페이지는 이전·다음 방식입니다.
- 개인 목록은 no-store이며 검색 색인에서 제외합니다. SEO 설정은 접근 제어를 대신하지 않습니다.

## 관련 검증

`CourseBookmarkControllerTests`, `CourseBookmarkIntegrationTests`와 상세·미리보기 권한 테스트가 있습니다.
DB 테스트는 로컬 DB의 임시 테이블로 실행합니다.

```sh
cd backend
./gradlew test --tests '*CourseBookmarkControllerTests'
RUN_DB_TESTS=true ./gradlew test --rerun-tasks --tests '*CourseBookmarkIntegrationTests' --tests '*CourseRepositoryIntegrationTests'
```

## 구현 근거

[찜 서비스·모델](../../backend/src/main/kotlin/com/runningcourse/course/CourseBookmarkService.kt) · [찜 SQL](../../backend/src/main/kotlin/com/runningcourse/course/CourseBookmarkRepository.kt)
