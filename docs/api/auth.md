# 사용자 인증과 세션

## Kotlin API

- `POST /api/auth/register`: email, password, displayName. 성공 201, user와 세션 token 반환.
- `POST /api/auth/login`: email, password. 성공 200. 전달된 이전 세션을 폐기하고 새 세션을 발급합니다.
- `GET /api/auth/me`: Authorization Bearer 세션으로 로그인 사용자 확인. 성공 200, 미인증/만료 401.
- `POST /api/auth/logout`: 전달 세션 삭제. 성공 204. 세션이 없어도 성공합니다.

이메일은 trim·소문자로 정규화해 UNIQUE를 적용합니다. 중복 가입은 409입니다.
닉네임은 1~40자입니다. 비밀번호는 10자 이상/UTF-8 72바이트 이하이며 BCrypt cost 12로 해시합니다.
이메일 또는 비밀번호가 틀린 로그인은 같은 401 메시지를 사용합니다.
무작위 256비트 세션을 발급하고 DB에는 SHA-256 해시만 저장합니다. 만료는 7일입니다.
세션 발급 시 만료 행을 정리하며, 매 요청에서 만료를 확인합니다.

## 브라우저 경계

Next.js `/api/session/register`, `/login`, `/logout`은 Kotlin 응답의 토큰을 브라우저 JSON으로 반환하지 않습니다.
세션은 `running_course_session` 쿠키로 설정합니다. HttpOnly, SameSite=Lax, Path=/, 7일,
프로덕션에서는 Secure이며 HTTPS가 필요합니다. 로컬 테스트는 `npm run dev`로 실행합니다.
모든 변경 요청은 Origin과 Next.js 요청 출처가 같은지 확인합니다. CORS를 개방하지 않습니다.
개인화 조회는 no-store이며 사용자 정보는 요청 단위 React.cache로만 공유합니다.
백엔드는 쿠키를 직접 인증에 사용하지 않고 Bearer 토큰을 검증합니다.

## 데이터와 권한

V2 마이그레이션은 app_users, user_sessions와 courses.owner_id를 추가합니다.
기존 코스는 소유자를 임의 배정하지 않고 공개 여부를 보존합니다.
신규 저장은 비공개이며 로그인 사용자가 소유합니다. 비공개 상세·수정·삭제·공개 전환은 소유자만 가능합니다.
북마크, 소셜 로그인, 이메일 소유 확인, 비밀번호 재설정·변경, 가입/로그인 요청 속도 제한은 아직 구현하지 않았습니다.
공개 운영 전에는 인증 요청 속도 제한과 계정 복구 절차를 추가해야 합니다.

## 테스트

`RUN_DB_TESTS=true ./gradlew test`는 임시 테이블에서 비밀번호 해시, 세션 만료·폐기,
교차 사용자 조회/변경 차단, 비공개 기본 저장과 공개/비공개·수정·삭제를 검증합니다.
테스트는 public 테이블의 사용자·코스 데이터에 쓰지 않습니다.
