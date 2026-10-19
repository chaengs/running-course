package com.runningcourse.course

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

@Repository
class CourseBookmarkRepository(private val jdbc: JdbcTemplate) {
    fun findAll(userId: Long, page: Int): List<BookmarkedCourse> = jdbc.query(
        """
        SELECT c.id, c.name, c.distance_meters, c.course_type
        FROM course_bookmarks b JOIN courses c ON c.id = b.course_id
        WHERE b.user_id = ? AND c.published = TRUE
        ORDER BY b.created_at DESC, b.course_id DESC
        LIMIT 21 OFFSET ?
        """.trimIndent(),
        { rs, _ -> BookmarkedCourse(rs.getLong("id"), rs.getString("name"), rs.getInt("distance_meters"), CourseType.valueOf(rs.getString("course_type"))) },
        userId, page.toLong() * 20
    )

    // Visibility changes and deletion must wait until this transaction finishes.
    fun lockPublished(courseId: Long): Boolean = jdbc.query(
        "SELECT id FROM courses WHERE id = ? AND published = TRUE FOR SHARE",
        { rs, _ -> rs.getLong("id") }, courseId
    ).isNotEmpty()

    fun exists(userId: Long, courseId: Long): Boolean = jdbc.queryForObject(
        "SELECT EXISTS(SELECT 1 FROM course_bookmarks WHERE user_id = ? AND course_id = ?)",
        Boolean::class.java, userId, courseId
    ) == true

    fun add(userId: Long, courseId: Long) {
        jdbc.update("INSERT INTO course_bookmarks(user_id, course_id) VALUES (?, ?) ON CONFLICT (user_id, course_id) DO NOTHING", userId, courseId)
    }

    fun remove(userId: Long, courseId: Long) {
        jdbc.update("DELETE FROM course_bookmarks WHERE user_id = ? AND course_id = ?", userId, courseId)
    }
}
