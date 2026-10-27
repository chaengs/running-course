# 사용자 인증과 세션

현재 코드 대조일: 2026-10-27. DB 세션 기반 인증이며 소셜 로그인이 아닙니다.

## Kotlin 백엔드 API

| 메서드·경로 | 본문·인증 | 성공 |
| --- | --- | --- |
| `POST /api/auth/register` | `{ email, password, displayName }` | 201 `{ user, token }` |
| `POST /api/auth/login` | `{ email, password }`, 이전 Bearer 세션 선택 | 200 `{ user, token }` |
| `GET /api/auth/me` | Bearer 세션 필수 | 200 `{ id, email, displayName }` |
| `POST /api/auth/logout` | Bearer 세션 선택 | 204 |

가입 시 이메일은 trim·소문자로 정규화하며 3~254자 및 형식을 확인합니다. 중복 이메일은 UNIQUE 제약과 INSERT 충돌 처리로 409입니다.
닉네임은 trim 후 1~40자입니다.

가입 비밀번호는 **유니코드 코드 포인트 기준 10~15자**입니다. 현재 로그인 검증은 별도로 최소 길이 10과 UTF-8 72바이트 이하를 확인합니다.
BCrypt cost 12로 해시합니다. 이메일이 없거나 비밀번호가 틀려도 같은 401 안내를 사용하며, 없는 사용자도 더미 해시 비교를 수행합니다.
잘못된 입력 형식은 400입니다.

## 세션 수명과 저장

- SecureRandom 32바이트(256비트)를 Base64 URL-safe 문자열로 인코딩한 토큰을 발급합니다.
- DB `user_sessions`에는 원문 대신 SHA-256 해시·사용자·만료 시각을 저장합니다.
- 만료는 발급 시점부터 7일입니다. 조회 때 DB 만료 조건을 확인하며 슬라이딩 연장은 없습니다.
- 가입·로그인 시 만료된 세션을 정리합니다.
- 로그인은 전달된 이전 세션을 폐기하고 새 세션을 만듭니다. 다른 기기의 모든 세션을 일괄 폐기하는 기능은 아닙니다.
- 로그아웃은 전달된 세션을 삭제하며 토큰이 없거나 이미 무효여도 성공합니다.
- 세션은 DB에 있으므로 서버 재시작만으로 로그아웃되지는 않습니다.

## Next.js와 브라우저 경계

브라우저는 다음 **Next.js 경로**를 사용합니다.

| 브라우저 경로 | 백엔드 경로 |
| --- | --- |
| `POST /api/session/register` | `/api/auth/register` |
| `POST /api/session/login` | `/api/auth/login` |
| `POST /api/session/logout` | `/api/auth/logout` |

Next.js는 백엔드 토큰을 브라우저 응답 JSON에 넣지 않고 `running_course_session` 쿠키로 설정합니다.
성공 JSON은 `{ user }`이며 로그아웃은 `{ "user": null }`입니다. 백엔드의 201/204와 달리 이 중계의 성공 응답은 현재 기본 200입니다.

쿠키 속성은 HttpOnly, SameSite=Lax, Path=/, 최대 7일이며 프로덕션에서 Secure입니다.
Next.js는 쿠키를 읽어 백엔드 `Authorization: Bearer <token>`으로 전달합니다. 백엔드는 브라우저 쿠키를 직접 인증하지 않습니다.
Next.js 인증 중계는 Origin이 요청 출처와 같은지 검증하며 실패 시 403입니다.
일반 코스·찜·고도 변경 중계도 출처와 세션을 검사합니다. 도보 테스트용 중계 등 모든 경로에 동일한 검사가 있다고 일반화하지 않습니다.

## 찜·내 코스 화면의 인증 흐름

```text
세션 쿠키에 토큰 없음 → 목록 API 호출 없이 /login 이동
세션 쿠키에 토큰 있음 → 해당 목록 API 호출
                         ├─ 200: 목록 표시
                         ├─ 401: /login 이동
                         └─ 다른 오류: 조회 오류 처리
```

화면 자체는 별도의 로그인 확인 API를 먼저 호출하지 않습니다. 공통 헤더의 사용자 이름 조회는 요청 단위 React.cache로 공유하는 별도 동작입니다.
토큰이 존재해도 유효한지는 백엔드에서 확인하며, 사용자 ID를 클라이언트 입력으로 결정하지 않습니다.
개인화 조회는 no-store입니다.

로그인 화면은 `/api/health`로 백엔드 준비 상태를 확인·재시도합니다. Render 유휴 후 재시작을 기다릴 수 있지만 이 처리가 서버 기동 시간을 단축하지는 않습니다.

## 권한 정책

- 공개 코스 목록·상세·미리보기: 익명 허용. 유효한 세션이 있으면 찜 상태 반영.
- 비공개 상세·미리보기: 작성자와 기존 찜 사용자만 허용.
- 생성·내 목록·찜 목록·고도·도보 계산: 세션 인증 필수.
- 코스 수정·삭제·공개 전환: 작성자만 허용. 찜했다고 수정 권한이 생기지 않습니다.
- 일반 상세에서 권한 없는 비공개 코스와 없는 코스는 같은 404입니다. 인증 필수 API의 미로그인은 401입니다.

자세한 정책은 [찜 문서](bookmarks.md), [코스 관리 문서](course-create.md)를 참고합니다.

## 현재 미제공 기능

소셜 로그인, 이메일 소유 확인, 비밀번호 재설정·변경, 가입·로그인 요청 속도 제한은 미구현입니다.
찜·코스 소유권·세션 인증은 이미 구현되어 있습니다.

## 검증 방법

```sh
cd backend
RUN_DB_TESTS=true ./gradlew test --rerun-tasks --tests '*AuthOwnershipIntegrationTests'
```

비밀번호 해시·세션 만료·폐기·다른 사용자 변경 차단 등의 검증이 있습니다. DB 테스트는 임시 테이블을 사용합니다.
이 문서의 명령은 실행 방법이며 문서 편집 중 새로 실행한 결과를 뜻하지 않습니다.

## 구현 근거

[인증 검증·세션 발급](../../backend/src/main/kotlin/com/runningcourse/auth/AuthService.kt) · [세션 SQL](../../backend/src/main/kotlin/com/runningcourse/auth/AuthRepository.kt) · [브라우저 인증 중계](../../frontend/src/app/api/session/[action]/route.ts)
