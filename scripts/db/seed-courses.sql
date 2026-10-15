-- 로컬 개발 전용. 실제 도로/보행 가능 여부를 검증하지 않은 가상 코스입니다.
-- Flyway 마이그레이션과 분리하여 개발자가 명시적으로 실행합니다.
-- 오류 발생 시 전체 트랜잭션이 취소됩니다.
\set ON_ERROR_STOP on
BEGIN;

CREATE TEMP TABLE sample_courses (
    name TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    course_type TEXT NOT NULL,
    published BOOLEAN NOT NULL,
    route geometry(LineString, 4326) NOT NULL
) ON COMMIT DROP;

INSERT INTO sample_courses (name, description, course_type, published, route)
VALUES
    ('[개발용] 여의도 3km 순환', '실제 도로를 따르지 않는 가상 경로입니다. 실제 러닝 안내에 사용하지 마세요. 개발 확인: 3km 거리 필터와 짧은 코스 표시.', 'LOOP', true, ST_GeomFromText('LINESTRING(126.9340000 37.5280000, 126.9424954 37.5280000, 126.9424954 37.5347373, 126.9340000 37.5347373, 126.9340000 37.5280000)', 4326)),
    ('[개발용] 여의도 5km 순환', '실제 도로를 따르지 않는 가상 경로입니다. 실제 러닝 안내에 사용하지 마세요. 개발 확인: 5km 목표의 하한 근처인 약 4.8km 코스.', 'LOOP', true, ST_GeomFromText('LINESTRING(126.9350000 37.5290000, 126.9485928 37.5290000, 126.9485928 37.5397797, 126.9350000 37.5397797, 126.9350000 37.5290000)', 4326)),
    ('[개발용] 여의도 5km 왕복', '실제 도로를 따르지 않는 가상 경로입니다. 실제 러닝 안내에 사용하지 마세요. 개발 확인: 5km 목표의 상한 근처인 약 5.2km 왕복 코스.', 'OUT_AND_BACK', true, ST_GeomFromText('LINESTRING(126.9360000 37.5300000, 126.9654515 37.5300000, 126.9360000 37.5300000)', 4326)),
    ('[개발용] 상암 10km 순환', '실제 도로를 따르지 않는 가상 경로입니다. 실제 러닝 안내에 사용하지 마세요. 개발 확인: 다른 위치에서의 10km 검색과 반경 밖 제외.', 'LOOP', true, ST_GeomFromText('LINESTRING(126.8850000 37.5680000, 126.9133332 37.5680000, 126.9133332 37.5904578, 126.8850000 37.5904578, 126.8850000 37.5680000)', 4326)),
    ('[개발용] 여의도 비공개 5km', '실제 도로를 따르지 않는 가상 경로입니다. 실제 러닝 안내에 사용하지 마세요. 개발 확인: 공개 목록에서 비공개 코스 제외.', 'LOOP', false, ST_GeomFromText('LINESTRING(126.9345000 37.5285000, 126.9486591 37.5285000, 126.9486591 37.5397289, 126.9345000 37.5397289, 126.9345000 37.5285000)', 4326));

-- 같은 스크립트의 동시 실행까지 직렬화하여 중복 삽입을 방지합니다.
SELECT pg_advisory_xact_lock(726001, 1);

INSERT INTO courses (name, description, start_location, route_geojson, distance_meters, course_type, published)
SELECT s.name,
       s.description,
       ST_StartPoint(s.route)::geography,
       ST_AsGeoJSON(s.route, 7)::jsonb,
       ROUND(ST_Length(s.route::geography))::integer,
       s.course_type,
       s.published
FROM sample_courses s
WHERE NOT EXISTS (SELECT 1 FROM courses c WHERE c.name = s.name);

-- 기존 샘플이 수정되었거나 경로/거리 데이터가 어긋나면 성공으로 처리하지 않습니다.
DO $$
BEGIN
    IF EXISTS (
        SELECT s.name
        FROM sample_courses s
        LEFT JOIN courses c ON c.name = s.name
        GROUP BY s.name
        HAVING COUNT(c.id) <> 1
    ) THEN
        RAISE EXCEPTION '샘플 코스가 없거나 같은 이름이 중복되었습니다.';
    END IF;

    IF EXISTS (
        SELECT 1
        FROM courses c JOIN sample_courses s ON c.name = s.name
        WHERE c.description IS DISTINCT FROM s.description
           OR c.course_type IS DISTINCT FROM s.course_type
           OR c.published IS DISTINCT FROM s.published
           OR c.route_geojson IS DISTINCT FROM ST_AsGeoJSON(s.route, 7)::jsonb
           OR NOT ST_Equals(c.start_location::geometry, ST_StartPoint(s.route))
           OR NOT ST_IsClosed(ST_GeomFromGeoJSON(c.route_geojson::text))
           OR c.distance_meters <> ROUND(ST_Length(s.route::geography))::integer
    ) THEN
        RAISE EXCEPTION '샘플 코스가 원본과 다릅니다. 변경 내역을 확인하세요.';
    END IF;
END $$;

SELECT c.id, c.name, c.distance_meters, c.course_type, c.published
FROM courses c JOIN sample_courses s ON c.name = s.name
ORDER BY c.id;

COMMIT;
