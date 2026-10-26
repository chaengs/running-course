CREATE TABLE walking_route_daily_usage (
    usage_date DATE NOT NULL,
    quota_scope VARCHAR(10) NOT NULL CHECK (quota_scope IN ('USER', 'GLOBAL')),
    subject_id BIGINT NOT NULL,
    request_count INTEGER NOT NULL DEFAULT 0 CHECK (request_count >= 0),
    PRIMARY KEY (usage_date, quota_scope, subject_id)
);

COMMENT ON TABLE walking_route_daily_usage IS '카카오 도보 경로 API 일별 요청 제한을 위한 사용량';
