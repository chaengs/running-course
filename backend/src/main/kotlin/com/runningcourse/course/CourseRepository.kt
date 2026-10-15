package com.runningcourse.course

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import tools.jackson.databind.json.JsonMapper

@Repository
class CourseRepository(
    private val jdbcTemplate: JdbcTemplate,
    private val jsonMapper: JsonMapper,
) {
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

    fun findPublishedById(id: Long): CourseDetail? = jdbcTemplate.query(
        """
        SELECT id, name, description, distance_meters, course_type, route_geojson,
               ST_Y(start_location::geometry) AS latitude,
               ST_X(start_location::geometry) AS longitude
        FROM courses
        WHERE id = ? AND published = TRUE
        """.trimIndent(),
        { rs, _ ->
            CourseDetail(
                id = rs.getLong("id"),
                name = rs.getString("name"),
                description = rs.getString("description"),
                distanceMeters = rs.getInt("distance_meters"),
                courseType = CourseType.valueOf(rs.getString("course_type")),
                startLocation = StartLocation(rs.getDouble("latitude"), rs.getDouble("longitude")),
                routeGeojson = jsonMapper.readTree(rs.getString("route_geojson")),
            )
        },
        id,
    ).singleOrNull()
}
