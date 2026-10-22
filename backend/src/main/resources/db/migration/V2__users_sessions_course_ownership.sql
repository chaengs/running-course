CREATE TABLE app_users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email VARCHAR(254) NOT NULL UNIQUE,
    display_name VARCHAR(40) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE user_sessions (
    token_hash CHAR(64) PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX user_sessions_expiry_idx ON user_sessions(expires_at);
-- 기존 샘플은 작성자 없이 보존하며 사용자에게 임의로 귀속시키지 않습니다.
ALTER TABLE courses ADD COLUMN owner_id BIGINT REFERENCES app_users(id);
CREATE INDEX courses_owner_idx ON courses(owner_id, id DESC);
