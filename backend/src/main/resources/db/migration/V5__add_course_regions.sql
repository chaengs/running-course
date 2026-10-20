ALTER TABLE courses
    ADD COLUMN region_sido VARCHAR(120),
    ADD COLUMN region_sigungu VARCHAR(120),
    ADD COLUMN region_eup_myeon_dong VARCHAR(120),
    ADD COLUMN region_source VARCHAR(80),
    ADD COLUMN region_resolved_at TIMESTAMPTZ;

CREATE INDEX courses_region_idx
    ON courses (region_sido, region_sigungu, region_eup_myeon_dong)
    WHERE published = TRUE;

COMMENT ON COLUMN courses.region_sido IS '코스 출발점의 시·도 (Nominatim 역지오코딩)';
COMMENT ON COLUMN courses.region_sigungu IS '코스 출발점의 시·군·구 (Nominatim 역지오코딩)';
COMMENT ON COLUMN courses.region_eup_myeon_dong IS '코스 출발점의 읍·면·동 (Nominatim 역지오코딩)';
COMMENT ON COLUMN courses.region_source IS '지역 정보 출처';
COMMENT ON COLUMN courses.region_resolved_at IS '지역 정보를 조회한 시각';
