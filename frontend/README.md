# Frontend

설정과 실행 방법은 [루트 README](../README.md)를 참고하세요.

## 코스 목록
`/`에서 Server Component가 `BACKEND_URL/api/courses`를 호출합니다.
Kotlin 서버와 DB를 실행하면 공개 코스 목록을 확인할 수 있습니다.

- URL 예: `/?page=0&size=3` (page는 0부터, size는 3·6·12 중 선택, 기본값 6)
- 페이지당 개수 적용 시 첫 페이지로 이동합니다.
- 잘못된 page/size는 기본 목록 `/`로 이동합니다.
- 로딩: Suspense 스켈레톤, 실패: error boundary와 재시도, 빈 목록: 안내 화면.
- 전체 경로/지도/상세 이동/위치·거리 필터는 후속 구현입니다.
- 코스 거리는 m를 km로 변환해 소수 둘째 자리까지 표시합니다.
- 개발용 샘플에는 가상 경로 안내가 표시됩니다.
