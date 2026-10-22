CREATE TYPE course_facility_type AS ENUM (
    'TOILET',
    'DRINKING_WATER',
    'LOCKER',
    'BENCH',
    'SHELTER',
    'SHOWER',
    'CHANGING_ROOM',
    'REST_AREA',
    'FITNESS_STATION',
    'DEFIBRILLATOR'
);

ALTER TABLE courses
    ADD COLUMN facilities_checked_at TIMESTAMPTZ,
    ADD COLUMN facility_source VARCHAR(40);

CREATE TABLE course_facilities (
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    osm_type VARCHAR(16) NOT NULL CHECK (osm_type IN ('node', 'way', 'relation')),
    osm_id BIGINT NOT NULL,
    facility_type course_facility_type NOT NULL,
    name TEXT,
    latitude DOUBLE PRECISION NOT NULL CHECK (latitude BETWEEN -90 AND 90),
    longitude DOUBLE PRECISION NOT NULL CHECK (longitude BETWEEN -180 AND 180),
    tags JSONB NOT NULL DEFAULT '{}'::jsonb,
    PRIMARY KEY (course_id, osm_type, osm_id, facility_type)
);

CREATE INDEX course_facilities_course_type_idx
    ON course_facilities (course_id, facility_type);

COMMENT ON COLUMN courses.facilities_checked_at IS 'OSM 주변 시설을 마지막으로 조회한 시각';
COMMENT ON COLUMN courses.facility_source IS '주변 시설 데이터 출처';
COMMENT ON TABLE course_facilities IS '코스 경로 주변의 OSM 러닝 참고 시설 스냅샷';
