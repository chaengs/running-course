<p align="center">
  <img src="frontend/public/running-course-logo.png" alt="러닝코스 Running Course 로고" width="480" />
</p>

# Running Course

Running Course는 지도에서 러닝 코스를 그리고 저장·공유하며, 내 주변의 코스를 발견하는 웹 서비스입니다.
익숙한 3km에서 5km로 거리를 늘리고 싶을 때, 이사한 동네에서 달릴 길을 찾을 때, 다른 러너가 만든 코스를 참고할 때 사용할 수 있습니다.

**[서비스 이용하기](https://running-course-making.vercel.app/)**

## 서비스 목적

- **원하는 코스를 직접 그리기**: 지도에서 경유 지점을 선택하고 실제 도보 경로와 총 거리를 확인합니다.
- **주변 코스 발견하기**: 출발 위치와 목표 거리에 맞는 코스를 찾습니다.
- **내 코스 모아두기**: 직접 만든 코스와 찜한 코스를 관리합니다.
- **경험 공유하기**: 달리기 코스를 친구에게 공유합니다.


## 주요 기능

| 기능 | 제공 내용 |
| --- | --- |
| 코스 탐색 | 코스 목록, 지도 미리보기, 위치·반경·거리 조건 검색 |
| 코스 상세 | 전체 경로, 거리, 지역, 소개, 고도 정보, 고도 기준 예상 난이도 |
| 코스 만들기 | 지도에서 경로점 선택, 카카오 도보 경로 연결, 지점 이동·삭제·되돌리기 |
| 내 코스 | 저장한 코스 조회, 수정·삭제, 공개 범위 변경, 조회·찜 통계 |
| 찜한 코스 | 공개 코스 찜·해제, 최근 찜한 순서로 목록 조회 |
| 공유 | 공개 코스 상세 주소 복사 |
| 계정 | 이메일 회원가입, 로그인·로그아웃, 세션 기반 접근 제어 |

## 사용 방법

### 1. 달릴 코스 찾기

1. 홈에서 공개된 코스를 둘러봅니다. 코스 목록과 상세 화면은 로그인하지 않아도 볼 수 있습니다.
2. 현재 위치를 사용하거나 주소·장소를 검색해 출발 위치를 정합니다.
3. 검색 반경과 목표 거리를 선택합니다.
4. 코스 상세 페이지에서 전체 경로와 거리를 확인합니다.
5. 다시 보고 싶은 코스는 찜해둡니다.

위치 검색은 **설정한 위치에서 코스 출발점까지의 직선거리**를 기준으로 합니다.
목표 거리 필터는 다음 구간으로 검색합니다. 경계값은 앞 구간에 포함됩니다.

| 선택 | 코스 전체 거리 |
| --- | --- |
| 3km | 4km 이하 |
| 5km | 4km 초과~7km 이하 |
| 10km | 7km 초과~11km 이하 |
| 그 이상 | 11km 초과 |

### 2. 나만의 코스 만들기

1. 회원가입 또는 로그인 후 **코스 만들기** 화면으로 이동합니다.
2. 지도에서 출발점과 경유 지점을 차례로 선택합니다.
3. 각 구간의 도보 경로가 계산되면 지도에 표시된 선과 거리를 확인합니다.
4. 경로점을 이동·삭제하거나 되돌리기를 사용해 코스를 조정합니다.
5. 출발점으로 돌아오는 경로를 완성하고, 코스 이름·소개·유형을 입력합니다.
6. 필요한 경우 고도를 조회해 경사와 고도 기준 예상 난이도를 확인합니다.
7. 공개 범위를 선택하고 저장합니다.

저장 가능한 코스는 출발점과 도착점이 같아야 하며, 경로 길이는 1m~100km입니다.
지도에 점을 찍는 작업은 경로 계산 API를 사용하므로 응답까지 기다림이 생길 수 있습니다.

### 3. 저장·공유·관리하기

- **내 코스**에서 직접 만든 코스를 수정·삭제하거나 공개 범위를 바꿉니다.
- 공개 코스는 상세 주소를 공유할 수 있습니다.
- **찜한 코스**에서 저장한 다른 러너의 코스를 다시 확인하고 찜을 해제합니다.
- 공개 코스가 비공개로 바뀌어도 기존에 찜한 사용자는 찜을 해제하기 전까지 코스 정보를 계속 볼 수 있습니다.
- 코스 수정·삭제·공개 범위 변경은 작성자만 할 수 있습니다.

## 기술 구성

| 영역 | 사용 기술·역할 |
| --- | --- |
| 프론트엔드 | Next.js App Router, React, TypeScript |
| 백엔드 | Kotlin, Spring Boot, Spring MVC |
| 데이터 접근 | JdbcTemplate과 명시적 SQL, Spring 트랜잭션 |
| 데이터베이스 | PostgreSQL, PostGIS |
| 스키마 관리 | Flyway SQL 마이그레이션 |
| 지도 표시·편집 | Leaflet, OpenStreetMap |
| 주소·장소 검색 / 경로 계산 | 카카오 로컬 API / 카카오 도보 경로 API |
| 고도 / 지역 정보 | Open Topo Data / Nominatim 역지오코딩 |
| 배포 | Vercel 프론트엔드, Render 백엔드 |

```text
브라우저
  ├─ Leaflet + 지도 타일: 지도 표시
  └─ Next.js (Vercel): 화면 렌더링·API 중계·세션 쿠키
       └─ Kotlin / Spring Boot (Render)
            ├─ PostgreSQL + PostGIS: 사용자·세션·코스·찜·요청 사용량
            ├─ Kakao: 주소·장소 검색, 도보 경로 계산
            ├─ Open Topo Data: 고도 조회
            └─ Nominatim: 출발점 지역 정보 조회
```

Leaflet은 지도 표시와 편집을, 카카오는 선택한 두 지점 사이의 도보 경로 계산을 담당합니다.
코스 경로는 GeoJSON으로 저장하고, PostGIS로 거리 계산과 출발점 주변 검색을 처리합니다.
브라우저가 백엔드를 호출하는 요청은 Next.js 서버를 거칩니다.

### 조회와 인증

- 공개 목록의 무한 스크롤 한 개를 더 조회해 다음 페이지 유무를 판단합니다.
- 지도 미리보기는 전체 상세 데이터 대신 경로만 조회합니다.
- 공개·소유자·기존 찜 사용자의 조회 권한을 상세와 미리보기에 동일하게 적용합니다.
- 찜 목록과 내 코스는 유저 토큰이 없으면 목록 API를 호출하지 않고 로그인 화면으로 이동합니다.
- 유저 토큰이 있으면 목록 API가 세션을 검증하고, 401 응답 시 로그인 화면으로 이동합니다.
- 세션 토큰은 HttpOnly 쿠키로 관리하고 Next.js 서버에서 백엔드의 Bearer 헤더로 전달합니다. DB에는 토큰 원문 대신 해시를 저장합니다.
- 개인정보와 찜 상태가 포함된 조회는 공용 캐시로 공유하지 않습니다.

## 배포 서비스

- 웹: [running-course-making.vercel.app](https://running-course-making.vercel.app/)
- 백엔드 상태: [running-course-api.onrender.com/api/health](https://running-course-api.onrender.com/api/health)

| 배포 대상 | 설정 |
| --- | --- |
| Vercel | 프로젝트 루트 `frontend`, 서버 환경변수 `BACKEND_URL=https://running-course-api.onrender.com` |
| Render | 프로젝트 루트 `backend`, Dockerfile `Dockerfile` |
| 운영 DB | PostGIS 확장을 사용할 수 있는 PostgreSQL, 백엔드의 DB 환경변수로 연결 |

로컬·개발·운영 DB 연결 설정은 구분해서 관리하며, `main` 병합 후 실제 배포 성공 여부는 각 플랫폼의 로그와 상태 API로 확인합니다.

## 로컬 실행

### 준비 사항

- Node.js 24 (`frontend/.nvmrc`), npm
- JDK 21 — IntelliJ의 Project SDK와 Gradle JVM도 21로 설정
- Docker Desktop 또는 Docker Compose 실행 환경
- 주소·장소 검색과 도보 경로 계산에 사용할 카카오 REST API 키

### 1. 데이터베이스

저장소 루트에서 실행합니다.

```sh
cp .env.example .env
docker compose up -d --wait
```

PostgreSQL 17 + PostGIS 3.5를 사용합니다. 로컬 DB는 기본적으로 `127.0.0.1:5432`에서 접근합니다.

### 2. 백엔드

별도 터미널에서 실행합니다.

```sh
cd backend
export KAKAO_REST_API_KEY='발급받은_REST_API_키'
./gradlew bootRun
```

DB 연결은 기본값으로 로컬 Compose DB와 맞춰져 있습니다.
애플리케이션 시작 시 Flyway가 필요한 마이그레이션을 적용합니다.
상태 확인: [localhost:8080/api/health](http://localhost:8080/api/health)

### 3. 프론트엔드

다른 터미널에서 실행합니다.

```sh
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

[localhost:3000](http://localhost:3000)에서 서비스를 이용합니다.

### 환경변수

루트 `.env`는 Docker Compose용이며 Spring Boot가 자동으로 읽지 않습니다.
백엔드 변수는 셸 또는 IDE 실행 설정에, 프론트 변수는 `frontend/.env.local`에 설정합니다.
운영 비밀값과 실제 환경변수 파일은 커밋하지 않습니다.

| 대상 | 변수 | 기본값·용도 |
| --- | --- | --- |
| Compose | `POSTGRES_DB`, `POSTGRES_USER` | `running_course` |
| Compose | `POSTGRES_PASSWORD` | `local_password` — 로컬 개발 전용 |
| Compose | `POSTGRES_PORT` | `5432` |
| 백엔드 | `DATABASE_URL` | `jdbc:postgresql://localhost:5432/running_course` |
| 백엔드 | `DATABASE_USERNAME`, `DATABASE_PASSWORD` | `running_course`, `local_password` — 로컬 기본값 |
| 백엔드 | `PORT` | `8080` |
| 백엔드 | `KAKAO_REST_API_KEY` | 기본값 없음, 주소 검색·도보 경로에 사용 |
| 백엔드 | `KAKAO_WALKING_CACHE_TTL_SECONDS` | `900` — 구간 캐시 15분 |
| 백엔드 | `KAKAO_WALKING_CACHE_MAX_ENTRIES` | `2000` — 캐시 최대 구간 수 |
| 백엔드 | `KAKAO_WALKING_PER_USER_DAILY_LIMIT` | `800` — 사용자별 일일 호출 예약 상한 |
| 백엔드 | `KAKAO_WALKING_GLOBAL_DAILY_LIMIT` | `900` — 서비스 전체 일일 호출 예약 상한 |
| 프론트엔드 | `BACKEND_URL` | `http://localhost:8080` — Next.js 서버에서 사용 |
| 프론트엔드 | `NEXT_PUBLIC_OSM_TILE_URL` | 선택 사항, 비워두면 기본 OSM 타일 사용 |

운영 DB URL도 JDBC 형식으로 설정하고 제공자의 SSL 연결 요구사항을 적용합니다.
운영에서는 로컬 기본 비밀번호를 사용하지 않습니다.

## API 사용량과 운영 제한

도보 경로의 서비스 자체 기본 한도는 **사용자별 하루 800회, 전체 하루 900회**입니다.
전체 한도는 모든 사용자가 공유하며 카카오 앱의 쿼터와는 별도로 적용됩니다.

- 캐시 적중에는 사용량을 추가하지 않습니다.
- 같은 구간의 동시 요청은 하나의 외부 요청으로 합칩니다.
- 구간 캐시는 서버 메모리에 있으므로 재시작하면 사라집니다.
- 사용량은 DB의 `walking_route_daily_usage`에 한국 시간 날짜별로 저장하므로 서버 재시작으로 초기화되지 않습니다.
- 외부 호출 전에 사용량을 예약합니다. 이후 호출 실패도 집계되므로 카카오 콘솔의 실제 사용량과 다를 수 있습니다.

| HTTP 상태 | 오류 코드 | 의미 |
| --- | --- | --- |
| 429 | `USER_DAILY_LIMIT_EXCEEDED` | 사용자 일일 한도 초과 |
| 429 | `GLOBAL_DAILY_LIMIT_EXCEEDED` | 서비스 전체 일일 한도 초과 |


### 상태 확인과 데이터 관리

- `GET /api/health`: DB 연결과 PostGIS 버전을 실제 조회합니다.
- `GET /actuator/health`: 운영용 상태 확인이며 상세 정보는 공개하지 않습니다.
- Flyway SQL은 `backend/src/main/resources/db/migration/`에 있습니다. 이미 적용한 파일 대신 다음 버전의 마이그레이션을 추가합니다.
- 로컬 DB 중지: `docker compose stop` — 볼륨 데이터 유지
- Compose DB 이미지는 `linux/amd64`로 지정되어 Apple Silicon에서는 에뮬레이션을 사용합니다.

## 검증 방법

프론트엔드:

```sh
cd frontend
npm run lint
npm run typecheck
npm run build
```

백엔드:

```sh
cd backend
./gradlew test bootJar
```

실제 PostgreSQL/PostGIS 통합 테스트는 로컬 DB를 실행하고 마이그레이션을 적용한 뒤 별도로 활성화합니다.
DB 환경변수는 로컬 테스트 DB를 가리키도록 설정합니다.

```sh
cd backend
RUN_DB_TESTS=true ./gradlew test --rerun-tasks
```

DB 테스트는 세션 전용 임시 테이블을 사용해 운영 데이터와 분리합니다.
인증·소유권·찜·검색·거리 계산·일일 사용량 제한 등의 동작을 검증합니다.
테스트 통과와 실제 외부 API의 경로 품질·배포 환경 응답 시간 검증은 구분합니다.

## 현재 한계와 개선 방향

- **자동 코스 추천**: 현재는 코스를 직접 편집하는 방식입니다. 목표 거리 기반 자동 순환 코스 추천은 계획 중에 있습니다.
- **외부 API와 서버 대기**: 경로·고도·지역 정보는 외부 서비스에 의존합니다. 유휴 후 첫 접속, 외부 응답 지연, 사용량 제한이라는 한계가 있습니다.
- **계정 기능**: 소셜 로그인, 이메일 소유 확인, 비밀번호 재설정·변경 등은 아직 제공하지 않습니다.
- **탐색·공유 확장**: 노면·경사 조건 탐색, GPX 가져오기·내보내기, 완주 기록·리뷰 등은 계획 중에 있습니다.

## 저장소 구조와 관련 문서

```text
frontend/     Next.js 화면·서버 API 중계
backend/      Kotlin API·SQL·마이그레이션·테스트
compose.yaml  로컬 PostgreSQL/PostGIS
docs/        기획·API·설계 문서
```

- [기획 배경과 요구사항](docs/prd.md)
- [코스 목록·검색 API](docs/api/courses.md)
- [코스 생성 API](docs/api/course-create.md)
- [코스 상세 API](docs/api/course-detail.md)
- [찜 API와 공개 범위 정책](docs/api/bookmarks.md)
- [인증과 세션](docs/api/auth.md)
- [고도 API](docs/api/elevation.md)
- [고도 기준 예상 난이도 설계](docs/elevation-difficulty.md)
