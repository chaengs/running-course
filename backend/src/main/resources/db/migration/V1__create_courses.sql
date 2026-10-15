CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE courses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    start_location geography(Point, 4326) NOT NULL,
    route_geojson JSONB NOT NULL,
    distance_meters INTEGER NOT NULL CHECK (distance_meters > 0),
    course_type VARCHAR(20) NOT NULL CHECK (course_type IN ('LOOP', 'OUT_AND_BACK')),
    published BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX courses_start_location_idx ON courses USING GIST (start_location);
CREATE INDEX courses_published_distance_idx ON courses (distance_meters) WHERE published;
COMMENT ON COLUMN courses.start_location IS 'WGS84 출발점. 좌표 입력 순서는 경도, 위도';
COMMENT ON COLUMN courses.route_geojson IS 'GeoJSON LineString geometry. 좌표 순서는 경도, 위도';
COMMENT ON COLUMN courses.updated_at IS '수정 시 애플리케이션에서 갱신';
