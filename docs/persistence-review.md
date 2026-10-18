# 영속성 코드 검토

`kotlin-backend-jpa-entity-mapping` 스킬로 현재 구현을 검토했다.

## 현재 사용 방식

- Spring Data JPA 의존성·Kotlin JPA/no-arg·all-open 설정은 있지만 실제 @Entity/JpaRepository는 없다.
- PostGIS SQL을 JdbcTemplate으로 실행하고 DTO로 직접 매핑한다. DTO data class는 유지한다.
- 따라서 프록시 equals/hashCode, lazy association, orphanRemoval 문제는 현재 적용 대상이 아니다.
- open-in-view는 false이며 DB 스키마는 Flyway가 관리한다. JPA validate 설정이 JDBC DTO와 SQL을 검증하는 것은 아니다.

## 개선

- AuthRepository에 사용자·세션 SQL, OwnedCourseRepository에 소유 코스 SQL을 분리했다.
- 서비스는 검증·인증·트랜잭션·HTTP 오류 해석을 담당한다. SQL 조회 결과와 인증 응답을 구분한다.
- 이메일 UNIQUE 제약을 유지하고 INSERT ON CONFLICT(email) DO NOTHING RETURNING으로 동시 중복 가입을 처리한다.
  중복 시 반환값을 서비스가 409로 변환하며, 다른 DB 무결성 오류를 이메일 중복으로 오인하지 않는다.
- 내 코스 상세 SELECT *를 필요한 열만 지정하는 projection으로 변경했다.
- 수정 전 전체 경로 조회를 ID/owner 조건 SELECT FOR UPDATE로 대체했다.
  트랜잭션이 유지되는 동안 수정·삭제가 같은 행에 대해 직렬화된다. 모든 변경 SQL은 owner_id 조건도 유지한다.
- 읽기는 readOnly, 변경은 쓰기 트랜잭션으로 경계를 명시한다.

## 제약과 인덱스

이메일 UNIQUE, 세션 token_hash PK, 세션 user_id와 코스 owner_id FK가 존재한다.
공개 거리 검색, 출발점 공간 검색, 내 코스 최신순 조회 및 세션 만료 정리 인덱스를 유지했다.
코스 이름은 서로 다른 사용자가 동일하게 지정할 수 있으므로 UNIQUE를 추가하지 않았다.
중복 코스 제출 방지는 별도 idempotency key 설계가 필요하며 이 변경에서 추가하지 않았다.

## 검증과 한계

실제 PostgreSQL/PostGIS 임시 테이블에서 인증·소유권 CRUD·중복 처리와 트랜잭션 정상 동작을 검증한다.
서비스 단위 테스트는 수정 시 전체 코스 조회 없이 소유권 확인 후 변경하고 타인·잘못된 입력을 차단함을 확인한다.
SQL 쿼리 수를 계측한 N+1 성능 개선을 주장하지 않는다.
행 잠금은 작업 중 경쟁을 직렬화하지만 오래 열린 편집 폼의 덮어쓰기를 막지 않는다.
이를 방지하려면 별도 version 열과 클라이언트 버전 전달을 통한 낙관적 잠금이 필요하다.
JPA 엔티티를 도입할 경우 DTO와 분리하고 nullable 생성 ID, 프록시 호환성, 안정적인 동일성 전략을 별도로 적용한다.
