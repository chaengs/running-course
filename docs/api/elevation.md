# 코스 고도 계산·저장·표시

현재 코드 대조일: 2026-10-27. 고도 API는 계산 결과를 반환하고, 코스 생성·수정 API가 전달된 프로필을 저장합니다.
현재는 작성 중 미리보기뿐 아니라 저장 코스의 상세 표시도 구현되어 있습니다.

## POST /api/my/elevation

Kotlin 백엔드 API이며 Bearer 세션 인증이 필요합니다.
브라우저는 Next.js의 `POST /api/elevation`을 사용하며 해당 중계는 Origin과 HttpOnly 세션 쿠키를 확인합니다.

```json
{
  "routeGeojson": {
    "type": "LineString",
    "coordinates": [[126.934, 37.528], [126.935, 37.529]]
  }
}
```

- 최소 2점, 최대 10000점의 LineString입니다. API 자체는 열린 경로도 허용합니다.
- 좌표는 `[경도, 위도]`이며 유한한 WGS84 범위여야 합니다.
- 경로 길이는 1~100000m입니다. 중복 좌표만으로 길이가 1m 미만이면 거부합니다.
- UI 자동 계산은 별도 조건으로 닫힌 경로·서로 다른 3지점 이상을 요구합니다.

## 계산 과정

1. 반지름 6371008.8m의 구면 거리로 구간 길이를 계산합니다.
2. 약 50m 간격으로 구면 보간합니다. `ceil(길이/50)` 구간을 최대 499개로 제한하므로 시작·끝을 포함해 최대 500개 표본입니다.
3. 긴 경로는 표본 간격이 넓어집니다. 반환한 `sampleIntervalMeters`가 실제 적용 간격입니다.
4. Open Topo Data의 `srtm30m` 데이터를 bilinear 방식으로 조회합니다. 동일 좌표를 중복 제거하고 최대 100개씩 나누므로 한 계산에 외부 요청이 최대 5회 발생합니다.
5. 중앙값 3개 평활화를 적용합니다. 열린 경로 양 끝은 원본을 유지하며 닫힌 경로는 순환 중앙값으로 시작·끝을 일치시킵니다.
6. 5m 방향 전환 임계값으로 누적 상승·하강을 계산합니다. 작은 반대 방향 흔들림을 무시하되 지속되는 작은 상승은 누적합니다.
7. 동일 프로필의 거리와 누적 상승으로 [고도 기준 예상 난이도](../elevation-difficulty.md)를 계산합니다.

경로 저장의 최종 거리는 PostGIS geography 계산값입니다. 고도 API의 구면 거리와 완전히 같다고 가정하지 않습니다.

## 응답 필드

| 필드 | 설명 |
| --- | --- |
| `samples` | `{ distanceMeters, elevationMeters, rawElevationMeters }` 배열 |
| `minElevationMeters`, `maxElevationMeters` | 처리된 표본의 최저·최고 고도 |
| `ascentMeters`, `descentMeters` | 평활화·임계값 처리 후 누적 상승·하강 |
| `distanceMeters` | 고도 계산에 사용한 구면 경로 거리 |
| `sampleIntervalMeters` | 실제 적용한 표본 간격 |
| `dataset` | 현재 `srtm30m` |
| `calculatedAt` | 계산 시각(Instant) |
| `algorithmVersion` | 현재 `median3-hysteresis5-v1` |
| `difficulty` | `{ level, ascentMetersPerKm, policyVersion }` |

고도 미조회·누락을 해발 0m로 대체하지 않습니다. 0m 고도 또는 0m 상승이라는 유효한 측정 결과와 구분합니다.

## 제한과 오류

| 상태 | 의미 |
| --- | --- |
| 400 | 잘못된 좌표·형식·길이 |
| 401 | 로그인 세션 없음·만료 |
| 422 | 일부 지점의 고도 데이터 누락 |
| 429 | 다른 고도 계산 진행 중, 자체 한도 초과 또는 외부 429 |
| 503 | 외부 장애·연결 실패·계산 중단 |

단일 Kotlin 프로세스는 전체 고도 조회 작업을 잠금으로 직렬화합니다. 다른 계산이 진행 중이면 기다리는 대신 429를 반환합니다.
외부 요청 시작 간격은 1.1초이며 **UTC 날짜 기준 외부 요청 900회/프로세스**를 제한합니다.
중복 제거 후 분할한 배치 수로 집계하므로 한 번의 고도 계산과 한 번의 외부 호출은 다를 수 있습니다.

카운터와 잠금은 메모리에 있으므로 재시작하면 초기화되고 인스턴스 간 공유되지 않습니다.
한국 시간·DB 기반인 도보 경로의 사용자별 800회/전체 900회 제한과 다른 정책입니다.
여러 인스턴스로 확장할 때는 공용 제한 저장소가 필요합니다.

외부 고도 호출은 DB 트랜잭션 없이 수행합니다. 기본 URL은 `https://api.opentopodata.org/v1/srtm30m`이며 `elevation.api-url` 설정으로 변경할 수 있습니다.
외부 데이터셋의 실제 정확도·가용성은 계산 코드 테스트와 별도로 검증해야 합니다.

Next.js 중계는 백엔드 비정상 상태를 사용자용 `{ message }`로 바꾸고 상태 코드를 유지합니다.
중계 통신·시간 초과는 502가 될 수 있습니다. 요청 시간 제한은 백엔드 외부 호출 6초, Next.js 중계 40초입니다.

## 작성·수정 화면

- 서로 다른 3지점 이상과 시작·끝 일치를 만족하고 길이가 범위 안이면 변경이 멈춘 1.2초 후 자동 조회합니다.
- 기존 코스 수정 화면의 닫힌 경로도 자동 계산 대상입니다. 이름·소개·공개 범위·점 선택만 바뀌고 경로 객체가 유지되면 다시 요청하지 않습니다.
- 경로가 바뀌면 이전 결과를 숨기고 프로필을 비웁니다. 진행 중 응답·재시도·예약 타이머는 취소하거나 결과를 무시합니다.
- 429는 1.5·3·6초 간격으로 최대 3회 추가 시도합니다. 클라이언트 작업 전체 제한은 45초입니다.
- 취소가 이미 시작된 서버의 외부 호출까지 중단한다고 보장하지 않습니다.
- 최종 실패 시 다시 시도 안내를 표시하고 코스 저장은 계속 허용합니다.

## 저장과 상세 표시

- 생성·수정 요청의 선택 필드 `elevationProfile`을 `courses.elevation_profile` JSONB에 저장합니다.
- 상세 응답에 같은 프로필을 포함하고 목록에는 저장된 `difficulty.level`만 요약합니다.
- 저장 API는 프로필을 외부 API로 재계산하거나 실제 경로와의 일치를 검증하지 않습니다.
- 고도 없이 저장하거나 수정 시 프로필을 생략/null로 보내면 고도는 null로 저장할 수 있습니다. 공개 여부의 null 처리와 다릅니다.
- 상세 화면은 읽기 전용으로 저장된 고도를 표시하고 외부 고도 API를 다시 호출하지 않습니다. 기존 프로필은 정책 변경만으로 자동 갱신되지 않습니다.

## 그래프와 해석

요약은 전체 거리 → 누적 고도(누적 상승) → 최고 고도 → 고도 기준 예상 난이도입니다.
그래프는 포인터 또는 키보드 좌우·Home·End로 지점별 고도를 확인하며 별도 위치 슬라이더는 없습니다.
세로축은 최소 100m 범위와 읽기 쉬운 눈금을 유지합니다. 이는 시각적 과장을 줄이는 표시 규칙으로 누적 상승·난이도 수치를 바꾸지 않습니다.
최고-최저 높이 차이와 누적 상승은 다른 값입니다.

다리·터널의 구조물 높이 보정은 미구현이며 지형 고도 추정치를 실제 노면 높이·안전 판정으로 사용하지 않습니다.

## 관련 검증과 자료

`ElevationCalculatorTests`, `ElevationDifficultyTests`, `ElevationControllerTests`, `OpenTopoDataClientTests`에 계산·등급·인증·외부 응답 처리 테스트가 있습니다.
실제 외부 API 검증을 뜻하지 않는 모의 서버 테스트도 포함합니다.

- [Open Topo Data API](https://www.opentopodata.org/api/)
- [SRTM 데이터셋](https://www.opentopodata.org/datasets/srtm/)
- [코스 생성·수정 계약](course-create.md)

## 구현 근거

[표본·평활화·누적 상승](../../backend/src/main/kotlin/com/runningcourse/course/ElevationCalculator.kt) · [고도 응답·서비스](../../backend/src/main/kotlin/com/runningcourse/course/ElevationController.kt) · [외부 고도 조회 제한](../../backend/src/main/kotlin/com/runningcourse/course/OpenTopoDataClient.kt) · [자동 조회·재시도·표시](../../frontend/src/components/course-elevation.tsx)
