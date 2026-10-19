package com.runningcourse.course

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import tools.jackson.databind.json.JsonMapper

@Repository
class OwnedCourseRepository(private val jdbc: JdbcTemplate, private val mapper: JsonMapper) {
    fun findAll(owner: Long): List<MyCourse> = jdbc.query(
        "SELECT id, name, distance_meters, published FROM courses WHERE owner_id = ? ORDER BY id DESC LIMIT 100",
        { rs, _ -> MyCourse(rs.getLong("id"), rs.getString("name"), rs.getInt("distance_meters"), rs.getBoolean("published")) }, owner,
    )

    fun findById(id: Long, owner: Long): CourseDetail? = jdbc.query("""
        SELECT id, name, description, distance_meters, course_type, route_geojson, owner_id, published,
               ST_Y(start_location::geometry) AS latitude, ST_X(start_location::geometry) AS longitude
        FROM courses WHERE id = ? AND owner_id = ?
        """.trimIndent(), { rs, _ -> CourseDetail(rs.getLong("id"), rs.getString("name"), rs.getString("description"), rs.getInt("distance_meters"),
            CourseType.valueOf(rs.getString("course_type")), StartLocation(rs.getDouble("latitude"), rs.getDouble("longitude")),
            mapper.readTree(rs.getString("route_geojson")), owner, rs.getBoolean("published")) }, id, owner).singleOrNull()

    // 서비스 트랜잭션에서 소유권 확인부터 수정 완료까지 행 잠금을 유지합니다.
    fun lockOwned(id: Long, owner: Long): Boolean = jdbc.query(
        "SELECT id FROM courses WHERE id = ? AND owner_id = ? FOR UPDATE", { rs, _ -> rs.getLong("id") }, id, owner,
    ).isNotEmpty()

    fun update(id: Long, owner: Long, request: CreateCourseRequest): CreatedCourse? = jdbc.query("""
        WITH route AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(?),4326) AS geom),
        measured AS (SELECT geom, ROUND(ST_Length(geom::geography))::integer AS distance FROM route)
        UPDATE courses SET name = ?, description = ?, course_type = ?, route_geojson = ST_AsGeoJSON(geom)::jsonb,
        start_location = ST_StartPoint(geom)::geography, distance_meters = distance, published = COALESCE(?, courses.published), updated_at = CURRENT_TIMESTAMP
        FROM measured WHERE id = ? AND owner_id = ? AND distance BETWEEN 1 AND 100000
        RETURNING id, distance_meters
        """.trimIndent(), { rs, _ -> CreatedCourse(rs.getLong("id"), rs.getInt("distance_meters")) },
        mapper.writeValueAsString(request.routeGeojson), request.name.trim(), request.description.trim(), request.courseType.name, request.published, id, owner,
    ).singleOrNull()

    fun updateVisibility(id: Long, owner: Long, published: Boolean): Boolean =
        jdbc.update("UPDATE courses SET published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?", published, id, owner) == 1
    fun delete(id: Long, owner: Long): Boolean = jdbc.update("DELETE FROM courses WHERE id = ? AND owner_id = ?", id, owner) == 1
}
