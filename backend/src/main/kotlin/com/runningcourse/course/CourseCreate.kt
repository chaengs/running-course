package com.runningcourse.course

import com.runningcourse.auth.AuthService
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.json.JsonMapper
import java.net.URI

data class RouteGeometry(val type: String, val coordinates: List<List<Double>>)
data class CreateCourseRequest(val name: String, val description: String = "", val courseType: CourseType, val routeGeojson: RouteGeometry, val published: Boolean? = null, val elevationProfile: ElevationProfile? = null, val routeWaypoints: RouteGeometry? = null) {
    fun validate() {
        fun check(valid: Boolean, message: String) {
            if (!valid) throw ResponseStatusException(HttpStatus.BAD_REQUEST, message)
        }
        check(name.trim().length in 1..100, "코스 이름은 1~100자로 입력해 주세요.")
        check(description.length <= 300, "코스 소개는 300자 이하여야 합니다.")
        val route = routeGeojson
        check(route.type == "LineString", "LineString 경로만 저장할 수 있습니다.")
        check(route.coordinates.size in 4..10000, "경로점은 4~10000개여야 합니다.")
        check(route.coordinates.all { it.size == 2 && it[0].isFinite() && it[1].isFinite() && it[0] in -180.0..180.0 && it[1] in -90.0..90.0 }, "경로 좌표가 올바르지 않습니다.")
        check(route.coordinates.first() == route.coordinates.last(), "출발점과 도착점이 같아야 합니다.")
        check(route.coordinates.distinct().size >= 3, "서로 다른 경로점이 3개 이상 필요합니다.")
        routeWaypoints?.let { waypoints ->
            check(waypoints.type == "LineString", "경유점은 LineString 형식이어야 합니다.")
            check(waypoints.coordinates.size in 4..10000, "경유점은 4~10000개여야 합니다.")
            check(waypoints.coordinates.all { it.size == 2 && it[0].isFinite() && it[1].isFinite() && it[0] in -180.0..180.0 && it[1] in -90.0..90.0 }, "경유점 좌표가 올바르지 않습니다.")
            check(waypoints.coordinates.first() == waypoints.coordinates.last(), "경유점의 출발점과 도착점이 같아야 합니다.")
            check(waypoints.coordinates.distinct().size >= 3, "서로 다른 경유점이 3개 이상 필요합니다.")
        }
    }
}

data class CreatedCourse(val id: Long, val distanceMeters: Int)

@Repository
class CourseCreateRepository(private val jdbc: JdbcTemplate, private val mapper: JsonMapper) {
    fun insert(request: CreateCourseRequest, ownerId: Long, region: CourseRegion? = null): CreatedCourse? = jdbc.query(
        """
        WITH route AS (
          SELECT ST_SetSRID(ST_GeomFromGeoJSON(?), 4326) AS geom
        ), measured AS (
          SELECT geom, ROUND(ST_Length(geom::geography))::integer AS distance FROM route
        )
        INSERT INTO courses (name, description, course_type, route_geojson, route_waypoints, start_location, distance_meters, published, owner_id, elevation_profile,
                             region_sido, region_sigungu, region_eup_myeon_dong)
        SELECT ?, ?, ?, ST_AsGeoJSON(geom)::jsonb, ?::jsonb, ST_StartPoint(geom)::geography, distance, ?, ?, ?::jsonb, ?, ?, ?
        FROM measured WHERE distance BETWEEN 1 AND 100000
        RETURNING id, distance_meters
        """.trimIndent(),
        { rs, _ -> CreatedCourse(rs.getLong("id"), rs.getInt("distance_meters")) },
        mapper.writeValueAsString(request.routeGeojson), request.name.trim(), request.description.trim(), request.courseType.name,
        mapper.writeValueAsString(request.routeWaypoints ?: request.routeGeojson),
        request.published ?: false, ownerId, request.elevationProfile?.let(mapper::writeValueAsString), region?.sido, region?.sigungu, region?.eupMyeonDong,
    ).singleOrNull()
}

@Service
class CourseCreateService(
    private val repository: CourseCreateRepository,
    private val regionResolver: CourseRegionResolver,
) {
    @Transactional
    fun create(request: CreateCourseRequest, ownerId: Long): CreatedCourse {
        request.validate()
        val start = request.routeGeojson.coordinates.first()
        val region = regionResolver.resolve(latitude = start[1], longitude = start[0])
        return repository.insert(request, ownerId, region) ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "코스 거리는 1m~100km여야 합니다.")
    }
}

@RestController
@RequestMapping("/api/my/courses")
class CourseCreateController(
    private val service: CourseCreateService,
    private val auth: AuthService,
) {
    @PostMapping
    fun create(@RequestHeader("Authorization", required = false) authorization: String?, @RequestBody request: CreateCourseRequest): ResponseEntity<CreatedCourse> {
        val created = service.create(request, auth.requireUser(authorization).id)
        return ResponseEntity.created(URI("/api/courses/${created.id}")).body(created)
    }
}
