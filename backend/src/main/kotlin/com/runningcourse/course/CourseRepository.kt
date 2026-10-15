package com.runningcourse.course

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

@Repository
class CourseRepository(private val jdbcTemplate: JdbcTemplate) {
    // 공간 좌표 추출을 포함한 읽기 전용 projection은 PostGIS SQL로 처리합니다.
    fun findPublished(limit: Int, offset: Long): List<CourseSummary> = jdbcTemplate.query(
        """
        SELECT id, name, distance_meters, course_type,
               ST_Y(start_location::geometry) AS latitude,
               ST_X(start_location::geometry) AS longitude
        FROM courses
        WHERE published = TRUE
        ORDER BY id ASC
        LIMIT ? OFFSET ?
        """.trimIndent(),
        { rs, _ ->
            CourseSummary(
                id = rs.getLong("id"),
                name = rs.getString("name"),
                distanceMeters = rs.getInt("distance_meters"),
                courseType = CourseType.valueOf(rs.getString("course_type")),
                startLocation = StartLocation(rs.getDouble("latitude"), rs.getDouble("longitude")),
            )
        },
        limit,
        offset,
    )

    fun countPublished(): Long = jdbcTemplate.queryForObject(
        "SELECT COUNT(*) FROM courses WHERE published = TRUE", Long::class.java,
    ) ?: 0L
}
