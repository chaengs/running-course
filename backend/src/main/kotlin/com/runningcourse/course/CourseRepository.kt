package com.runningcourse.course

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import tools.jackson.databind.json.JsonMapper

@Repository
class CourseRepository(
    private val jdbcTemplate: JdbcTemplate,
    private val jsonMapper: JsonMapper,
) {
    fun findPublished(limit: Int, offset: Long, search: CourseSearch = CourseSearch(), viewerId: Long? = null): List<CourseSummary> {
        val filter = filters(search)
        val center = search.center
        val bookmarkExpression = if (viewerId != null) {
            "EXISTS(SELECT 1 FROM course_bookmarks b WHERE b.course_id = courses.id AND b.user_id = ?)"
        } else "FALSE"
        val distanceExpression = if (center != null) {
            "ST_Distance(start_location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography)"
        } else "NULL::double precision"
        val distanceArgs: List<Any> = if (center != null) listOf(center.longitude, center.latitude) else emptyList()
        val order = if (center != null) "distance_to_start_meters ASC, id ASC" else "id ASC"

        return jdbcTemplate.query(
            """
            SELECT id, name, distance_meters, course_type,
                   region_sido, region_sigungu, region_eup_myeon_dong,
                   elevation_profile #>> '{difficulty,level}' AS elevation_difficulty,
                   $bookmarkExpression AS is_bookmarked,
                   ST_Y(start_location::geometry) AS latitude,
                   ST_X(start_location::geometry) AS longitude,
                   $distanceExpression AS distance_to_start_meters
            FROM courses
            WHERE ${filter.clause}
            ORDER BY $order
            LIMIT ? OFFSET ?
            """.trimIndent(),
            { rs, _ ->
                CourseSummary(
                    id = rs.getLong("id"),
                    name = rs.getString("name"),
                    distanceMeters = rs.getInt("distance_meters"),
                    courseType = CourseType.valueOf(rs.getString("course_type")),
                    startLocation = StartLocation(rs.getDouble("latitude"), rs.getDouble("longitude")),
                    distanceToStartMeters = rs.getObject("distance_to_start_meters", Double::class.javaObjectType),
                    region = rs.readCourseRegion(),
                    elevationDifficulty = rs.getString("elevation_difficulty")?.let { ElevationDifficultyLevel.valueOf(it) },
                    isBookmarked = rs.getBoolean("is_bookmarked"),
                )
            },
            *((if (viewerId != null) listOf(viewerId) else emptyList()) + distanceArgs + filter.args + listOf(limit, offset)).toTypedArray(),
        )
    }

    fun countPublished(search: CourseSearch = CourseSearch()): Long {
        val filter = filters(search)
        return jdbcTemplate.queryForObject(
            "SELECT COUNT(*) FROM courses WHERE ${filter.clause}",
            Long::class.java,
            *filter.args.toTypedArray(),
        ) ?: 0L
    }

    private data class FilterSql(val clause: String, val args: List<Any>)

    // 개수와 목록에 동일한 조건을 적용하며, 사용자 입력은 SQL 문자열에 연결하지 않습니다.
    private fun filters(search: CourseSearch): FilterSql {
        val conditions = mutableListOf("published = TRUE")
        val args = mutableListOf<Any>()
        val center = search.center
        if (center != null) {
            conditions += "ST_DWithin(start_location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)"
            args.addAll(listOf(center.longitude, center.latitude, requireNotNull(search.effectiveRadiusMeters)))
        }
        if (search.targetDistanceMeters != null) {
            conditions += "distance_meters BETWEEN ? AND ?"
            args.addAll(listOf(requireNotNull(search.minDistanceMeters), requireNotNull(search.maxDistanceMeters)))
        }
        if (search.minimumDistanceMeters != null) {
            conditions += "distance_meters >= ?"
            args += search.minimumDistanceMeters
        }
        return FilterSql(conditions.joinToString(" AND "), args)
    }

    fun findVisibleById(id: Long, viewerId: Long?): CourseDetail? = jdbcTemplate.query(
        """
        SELECT id, name, description, distance_meters, course_type, route_geojson, route_waypoints, owner_id, published, elevation_profile,
               region_sido, region_sigungu, region_eup_myeon_dong,
               (SELECT COUNT(*) FROM course_bookmarks b WHERE b.course_id = courses.id) AS bookmark_count,
               EXISTS(SELECT 1 FROM course_bookmarks b WHERE b.course_id = courses.id AND b.user_id = COALESCE(?, 0)) AS is_bookmarked,
               ST_Y(start_location::geometry) AS latitude,
               ST_X(start_location::geometry) AS longitude
        FROM courses
        WHERE id = ? AND (
            published = TRUE
            OR owner_id = COALESCE(?, 0)
            OR EXISTS(SELECT 1 FROM course_bookmarks b WHERE b.course_id = courses.id AND b.user_id = COALESCE(?, 0))
        )
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
                routeWaypoints = rs.getString("route_waypoints")?.let(jsonMapper::readTree),
                ownerId = rs.getObject("owner_id", Long::class.javaObjectType),
                published = rs.getBoolean("published"),
                region = rs.readCourseRegion(),
                elevationProfile = rs.getString("elevation_profile")?.let { jsonMapper.readValue(it, ElevationProfile::class.java) },
                bookmarkCount = rs.getLong("bookmark_count"),
                isBookmarked = rs.getBoolean("is_bookmarked"),
            )
        },
        viewerId ?: 0, id, viewerId ?: 0, viewerId ?: 0,
    ).singleOrNull()

    // Preserve the detail endpoint's visibility rules without loading its other fields or bookmark counts.
    fun findVisiblePreview(id: Long, viewerId: Long?): tools.jackson.databind.JsonNode? = jdbcTemplate.query(
        """
        SELECT route_geojson FROM courses
        WHERE id = ? AND (
            published = TRUE OR owner_id = COALESCE(?, 0)
            OR EXISTS(SELECT 1 FROM course_bookmarks b WHERE b.course_id = courses.id AND b.user_id = COALESCE(?, 0))
        )
        """.trimIndent(),
        { rs, _ -> jsonMapper.readTree(rs.getString("route_geojson")) },
        id, viewerId ?: 0, viewerId ?: 0,
    ).singleOrNull()

    fun findPublishedById(id: Long): CourseDetail? = findVisibleById(id, null)

    fun recordPublishedView(id: Long): Boolean = jdbcTemplate.update(
        "UPDATE courses SET view_count = view_count + 1 WHERE id = ? AND published = TRUE", id,
    ) == 1
}
