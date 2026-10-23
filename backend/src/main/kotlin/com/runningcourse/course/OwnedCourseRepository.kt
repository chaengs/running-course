package com.runningcourse.course

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import tools.jackson.databind.json.JsonMapper

@Repository
class OwnedCourseRepository(private val jdbc: JdbcTemplate, private val mapper: JsonMapper) {
    fun findAll(owner: Long, page: Int, size: Int, sort: String): List<MyCourse> = jdbc.query(
        """
        SELECT c.id, c.name, c.distance_meters, c.course_type, c.created_at, c.published,
               c.region_sido, c.region_sigungu, c.region_eup_myeon_dong,
               CASE WHEN c.published THEN c.view_count ELSE 0 END AS view_count,
               COUNT(b.user_id) AS bookmark_count
        FROM courses c LEFT JOIN course_bookmarks b ON b.course_id = c.id
        WHERE c.owner_id = ?
        GROUP BY c.id
        ORDER BY ${when (sort) {
            "views" -> "CASE WHEN c.published THEN c.view_count ELSE 0 END DESC, c.id DESC"
            "bookmarks" -> "COUNT(b.user_id) DESC, c.id DESC"
            else -> "c.id DESC"
        }} LIMIT ? OFFSET ?
        """.trimIndent(),
        { rs, _ -> MyCourse(
            id = rs.getLong("id"),
            name = rs.getString("name"),
            distanceMeters = rs.getInt("distance_meters"),
            courseType = CourseType.valueOf(rs.getString("course_type")),
            createdAt = rs.getObject("created_at", java.time.OffsetDateTime::class.java),
            region = rs.readCourseRegion(),
            published = rs.getBoolean("published"),
            bookmarkCount = rs.getLong("bookmark_count"),
            viewCount = rs.getLong("view_count"),
        ) }, owner, size, page.toLong() * size,
    )

    fun count(owner: Long, published: Boolean?): Long = jdbc.queryForObject(
        "SELECT COUNT(*) FROM courses WHERE owner_id = ? AND (?::boolean IS NULL OR published = ?)",
        Long::class.java, owner, published, published,
    )!!

    fun stats(owner: Long): MyCourseStats = jdbc.queryForObject(
        """
        SELECT COUNT(*) AS total_courses,
               COALESCE(SUM(distance_meters), 0) AS total_distance_meters,
               COALESCE(SUM(view_count) FILTER (WHERE published = TRUE), 0) AS total_views,
               (SELECT COUNT(*) FROM courses bookmarked_course
                JOIN course_bookmarks b ON b.course_id = bookmarked_course.id
                WHERE bookmarked_course.owner_id = ?) AS total_bookmarks,
               COUNT(*) FILTER (WHERE published = TRUE) AS published_courses,
               COUNT(*) FILTER (WHERE published = FALSE) AS private_courses
        FROM courses WHERE owner_id = ?
        """.trimIndent(),
        { rs, _ -> MyCourseStats(
            totalCourses = rs.getLong("total_courses"),
            totalDistanceMeters = rs.getLong("total_distance_meters"),
            totalViews = rs.getLong("total_views"),
            totalBookmarks = rs.getLong("total_bookmarks"),
            publishedCourses = rs.getLong("published_courses"),
            privateCourses = rs.getLong("private_courses"),
        ) }, owner, owner,
    )

    fun findById(id: Long, owner: Long): CourseDetail? = jdbc.query("""
        SELECT id, name, description, distance_meters, course_type, route_geojson, route_waypoints, owner_id, published, elevation_profile,
               region_sido, region_sigungu, region_eup_myeon_dong,
               (SELECT COUNT(*) FROM course_bookmarks b WHERE b.course_id = courses.id) AS bookmark_count,
               EXISTS(SELECT 1 FROM course_bookmarks b WHERE b.course_id = courses.id AND b.user_id = courses.owner_id) AS is_bookmarked,
               ST_Y(start_location::geometry) AS latitude, ST_X(start_location::geometry) AS longitude
        FROM courses WHERE id = ? AND owner_id = ?
        """.trimIndent(), { rs, _ -> CourseDetail(
            id = rs.getLong("id"),
            name = rs.getString("name"),
            description = rs.getString("description"),
            distanceMeters = rs.getInt("distance_meters"),
            courseType = CourseType.valueOf(rs.getString("course_type")),
            startLocation = StartLocation(rs.getDouble("latitude"), rs.getDouble("longitude")),
            routeGeojson = mapper.readTree(rs.getString("route_geojson")),
            routeWaypoints = rs.getString("route_waypoints")?.let(mapper::readTree),
            ownerId = owner,
            published = rs.getBoolean("published"),
            region = rs.readCourseRegion(),
            elevationProfile = rs.getString("elevation_profile")?.let { mapper.readValue(it, ElevationProfile::class.java) },
            bookmarkCount = rs.getLong("bookmark_count"),
            isBookmarked = rs.getBoolean("is_bookmarked"),
        ) }, id, owner).singleOrNull()

    // 서비스 트랜잭션에서 소유권 확인부터 수정 완료까지 행 잠금을 유지합니다.
    fun lockOwned(id: Long, owner: Long): Boolean = jdbc.query(
        "SELECT id FROM courses WHERE id = ? AND owner_id = ? FOR UPDATE", { rs, _ -> rs.getLong("id") }, id, owner,
    ).isNotEmpty()

    fun recordView(id: Long, owner: Long): Boolean = jdbc.update(
        "UPDATE courses SET view_count = view_count + 1 WHERE id = ? AND owner_id = ? AND published = TRUE", id, owner,
    ) == 1

    fun update(id: Long, owner: Long, request: CreateCourseRequest, region: CourseRegion?): CreatedCourse? = jdbc.query("""
        WITH route AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(?),4326) AS geom),
        measured AS (SELECT geom, ROUND(ST_Length(geom::geography))::integer AS distance FROM route)
        UPDATE courses SET name = ?, description = ?, course_type = ?, route_geojson = ST_AsGeoJSON(geom)::jsonb, route_waypoints = ?::jsonb, elevation_profile = ?::jsonb,
        start_location = ST_StartPoint(geom)::geography, distance_meters = distance, published = COALESCE(?, courses.published),
        region_sido = ?, region_sigungu = ?, region_eup_myeon_dong = ?, updated_at = CURRENT_TIMESTAMP
        FROM measured WHERE id = ? AND owner_id = ? AND distance BETWEEN 1 AND 100000
        RETURNING id, distance_meters
        """.trimIndent(), { rs, _ -> CreatedCourse(rs.getLong("id"), rs.getInt("distance_meters")) },
        mapper.writeValueAsString(request.routeGeojson), request.name.trim(), request.description.trim(), request.courseType.name,
        mapper.writeValueAsString(request.routeWaypoints ?: request.routeGeojson), request.elevationProfile?.let(mapper::writeValueAsString),
        request.published, region?.sido, region?.sigungu, region?.eupMyeonDong, id, owner,
    ).singleOrNull()

    fun updateVisibility(id: Long, owner: Long, published: Boolean): Boolean =
        jdbc.update("UPDATE courses SET published = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND owner_id = ?", published, id, owner) == 1
    fun delete(id: Long, owner: Long): Boolean = jdbc.update("DELETE FROM courses WHERE id = ? AND owner_id = ?", id, owner) == 1
}
