# Running Course

지도에 러닝 코스를 직접 그리고 저장·공유하며, 주변의 공개 코스를 발견하는 웹 서비스입니다.
요구사항은 [PRD](docs/prd.md)를 참고하세요.

## 구성

- `frontend/`: Next.js App Router + TypeScript + ESLint, npm (VS Code)
- `backend/`: Kotlin + Spring Boot + Spring MVC + JPA + Flyway, Gradle Kotlin DSL (IntelliJ)
- `compose.yaml`: PostgreSQL 17 + PostGIS 3.5

## 준비

- Node.js 24 LTS 권장 (`frontend/.nvmrc`), npm
- JDK 21: IntelliJ의 Project SDK와 Gradle JVM도 21로 설정
- Docker Desktop 또는 Docker Compose를 제공하는 실행 환경 (엔진 실행 필요)

## 로컬 실행

저장소 루트에서 DB를 실행합니다.

```sh
cp .env.example .env
docker compose up -d --wait
```

다른 터미널에서 백엔드를 실행합니다.

```sh
cd backend
./gradlew bootRun
```

다른 터미널에서 프론트엔드를 실행합니다.

```sh
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

http://localhost:3000 에서 공개 코스 목록을 확인하세요.

`/login`에서 가입·로그인 후 `/courses/new`에서 작성하고 `/my/courses`에서 내 코스를 확인합니다.
새 코스는 비공개가 기본이며 작성·수정 화면의 '비공개로 저장' 토글로 공개 범위를 선택합니다. 상세 화면에서 공개·비공개 전환, 수정, 삭제, 공유 URL 복사를 제공합니다.
백엔드를 재시작하면 V2 사용자·세션·소유권 마이그레이션이 자동 적용됩니다.
기존 코스와 데이터는 유지합니다. 임시 관리자 키는 더 이상 사용하지 않습니다.
세션/운영 제한은 [인증 안내](docs/api/auth.md)를 참고하세요.

- `GET http://localhost:8080/api/courses`: 주변·목표 거리 검색을 지원하는 공개 코스 목록 ([API 문서](docs/api/courses.md))
- `GET http://localhost:8080/api/courses/{id}`: 공개 코스 상세와 전체 경로 ([API 문서](docs/api/course-detail.md))
- `GET http://localhost:8080/api/health`: DB에서 PostGIS 버전을 실제 조회
- `GET http://localhost:8080/actuator/health`: 운영용 상태 확인 (상세 비공개)

Next.js 서버가 백엔드에 요청하므로 현재 연결에는 CORS 설정이 필요하지 않습니다.
브라우저에서 백엔드를 직접 호출하는 기능을 추가할 때 호출 경로와 인증 방식을 함께 결정하세요.

## 환경변수

루트 `.env`는 Docker Compose용입니다. Spring Boot는 이 파일을 자동으로 읽지 않습니다.
기본값으로는 별도 설정 없이 연결됩니다. DB 설정 변경 시 백엔드 실행 환경도 맞추세요.

| 위치     | 변수                                  | 기본값                                          |
| -------- | ------------------------------------- | ----------------------------------------------- |
| Docker   | POSTGRES_DB / POSTGRES_USER           | running_course                                  |
| Docker   | POSTGRES_PASSWORD                     | local_password (로컬 개발 전용)                 |
| Docker   | POSTGRES_PORT                         | 5432                                            |
| Backend  | DATABASE_URL                          | jdbc:postgresql://localhost:5432/running_course |
| Backend  | DATABASE_USERNAME / DATABASE_PASSWORD | running_course / local_password                 |
| Backend  | PORT                                  | 8080                                            |
| Backend  | KAKAO_REST_API_KEY                    | 주소 검색용 Kakao REST API 키 (기본값 없음)     |
| Frontend | BACKEND_URL                           | http://localhost:8080                           |

백엔드 변수는 IntelliJ Run Configuration 또는 셸 환경변수로 전달합니다.
실제 환경변수 파일은 커밋하지 마세요. 운영 환경에서는 별도 비밀값을 사용하세요.
주소 검색을 사용하려면 [Kakao Developers](https://developers.kakao.com/)에서 REST API 키를 발급한 뒤 백엔드 실행 환경에 `KAKAO_REST_API_KEY`로 설정하고 Spring Boot를 재시작하세요. 이 키는 프론트엔드 환경변수에 넣지 마세요.

## 검증

```sh
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```

```sh
cd backend
./gradlew test bootJar
```

백엔드 테스트는 상태 확인, 목록 응답, 페이지 검증을 확인합니다.
실제 DB 조회 테스트는 `RUN_DB_TESTS=true ./gradlew test --rerun-tasks`로 실행합니다. 실제 DB 연결은 DB와 앱을 실행하고
`/api/health`에서 확인하세요. 프론트엔드는 조회 실패 시 오류 안내와 재시도 버튼을 표시합니다.

## DB 관리

Flyway가 시작 시 `backend/src/main/resources/db/migration/`의 SQL을 적용합니다.
적용한 파일은 수정하지 않고 `V2__...sql`처럼 새 파일을 추가하세요.
JPA는 `ddl-auto=validate`로 스키마를 검증하고 자동 변경하지 않습니다.
초기 스키마는 코스 정보, WGS84 출발점(공간 인덱스), GeoJSON 경로를 저장합니다.
사용자·세션·코스 소유권은 V2 마이그레이션에 포함됩니다. 북마크는 후속 구현입니다.

DB 종료: `docker compose stop` (데이터 유지).
DB 이미지는 linux/amd64로 지정했습니다. Apple Silicon에서는 Docker의 에뮬레이션을 사용합니다.
`docker compose` 명령이 없으면 Docker Desktop을 업데이트하거나 `docker-compose` 명령을 사용하세요.

## 다음 구현

1. 관리자 코스 등록
2. 인증·권한 및 북마크
3. 주소·지도 기반 검색 위치 선택
4. 실제 도로를 따르는 코스 데이터 확장

## 의존성 검사 참고

초기 npm audit에서 ESLint 개발 의존성의 braces 관련 경고가 발견되었습니다.
런타임 의존성과 구분해 `npm audit` / `npm audit --omit=dev`로 확인하세요.
프레임워크를 구버전으로 내리는 강제 수정은 적용하지 않았습니다.
