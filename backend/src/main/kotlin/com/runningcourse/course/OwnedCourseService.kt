package com.runningcourse.course

import com.runningcourse.auth.AuthService
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.json.JsonMapper

data class MyCourse(val id: Long, val name: String, val distanceMeters: Int, val published: Boolean)
data class VisibilityRequest(val published: Boolean)

@Service
class OwnedCourseService(private val jdbc: JdbcTemplate, private val mapper: JsonMapper) {
    fun list(owner: Long): List<MyCourse> = jdbc.query("SELECT id, name, distance_meters, published FROM courses WHERE owner_id = ? ORDER BY id DESC LIMIT 100",
        { rs, _ -> MyCourse(rs.getLong("id"), rs.getString("name"), rs.getInt("distance_meters"), rs.getBoolean("published")) }, owner)

    fun detail(id: Long, owner: Long): CourseDetail = jdbc.query("""
        SELECT *, ST_Y(start_location::geometry) AS latitude, ST_X(start_location::geometry) AS longitude
        FROM courses WHERE id = ? AND owner_id = ?
        """.trimIndent(), { rs, _ -> CourseDetail(rs.getLong("id"), rs.getString("name"), rs.getString("description"), rs.getInt("distance_meters"),
            CourseType.valueOf(rs.getString("course_type")), StartLocation(rs.getDouble("latitude"), rs.getDouble("longitude")),
            mapper.readTree(rs.getString("route_geojson")), owner, rs.getBoolean("published")) }, id, owner).singleOrNull()
        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "코스를 찾을 수 없습니다.")

    @Transactional
    fun update(id: Long, owner: Long, request: CreateCourseRequest): CreatedCourse {
        detail(id, owner)
        request.validate()
        val result = jdbc.query("""
            WITH route AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(?),4326) AS geom),
            measured AS (SELECT geom, ROUND(ST_Length(geom::geography))::integer AS distance FROM route)
            UPDATE courses SET name = ?, description = ?, course_type = ?, route_geojson = ST_AsGeoJSON(geom)::jsonb,
            start_location = ST_StartPoint(geom)::geography, distance_meters = distance, updated_at = CURRENT_TIMESTAMP
            FROM measured WHERE id = ? AND owner_id = ? AND distance BETWEEN 1 AND 100000
            RETURNING id, distance_meters
        """.trimIndent(), { rs, _ -> CreatedCourse(rs.getLong("id"), rs.getInt("distance_meters")) },
            mapper.writeValueAsString(request.routeGeojson), request.name.trim(), request.description.trim(), request.courseType.name, id, owner).singleOrNull()
        return result ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "코스 거리는 1m~100km여야 합니다.")
    }
    fun visibility(id: Long, owner: Long, published: Boolean) {
        if (jdbc.update("UPDATE courses SET published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?", published, id, owner) != 1)
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "코스를 찾을 수 없습니다.")
    }
    fun delete(id: Long, owner: Long) {
        if (jdbc.update("DELETE FROM courses WHERE id = ? AND owner_id = ?", id, owner) != 1)
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "코스를 찾을 수 없습니다.")
    }
}

@RestController
@RequestMapping("/api/my/courses")
class OwnedCourseController(private val auth: AuthService, private val courses: OwnedCourseService) {
    @GetMapping fun list(@RequestHeader("Authorization", required = false) authorization: String?) = courses.list(auth.requireUser(authorization).id)
    @GetMapping("/{id}") fun detail(@PathVariable id: Long, @RequestHeader("Authorization", required = false) authorization: String?) = courses.detail(id, auth.requireUser(authorization).id)
    @PutMapping("/{id}") fun update(@PathVariable id: Long, @RequestHeader("Authorization", required = false) authorization: String?, @RequestBody request: CreateCourseRequest) = courses.update(id, auth.requireUser(authorization).id, request)
    @PatchMapping("/{id}/visibility") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun visibility(@PathVariable id: Long, @RequestHeader("Authorization", required = false) authorization: String?, @RequestBody request: VisibilityRequest) = courses.visibility(id, auth.requireUser(authorization).id, request.published)
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: Long, @RequestHeader("Authorization", required = false) authorization: String?) = courses.delete(id, auth.requireUser(authorization).id)
}
