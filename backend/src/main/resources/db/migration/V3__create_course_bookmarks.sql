CREATE TABLE course_bookmarks (
    user_id BIGINT NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, course_id)
);

CREATE INDEX course_bookmarks_course_idx ON course_bookmarks(course_id);
