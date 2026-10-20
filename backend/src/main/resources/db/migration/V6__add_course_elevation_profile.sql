ALTER TABLE courses ADD COLUMN elevation_profile JSONB;

COMMENT ON COLUMN courses.elevation_profile IS '고도 계산 결과 프로필. Open Topo Data 기반';
