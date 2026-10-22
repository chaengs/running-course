ALTER TABLE courses
    ADD COLUMN view_count BIGINT NOT NULL DEFAULT 0 CHECK (view_count >= 0);

COMMENT ON COLUMN courses.view_count IS '상세 화면 열람 횟수';
