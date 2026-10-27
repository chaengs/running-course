package com.runningcourse.course

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertFalse
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertTrue
import tools.jackson.databind.json.JsonMapper
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.datasource.SingleConnectionDataSource

// 실제 PostgreSQL/PostGIS에 연결하되 세션 전용 임시 테이블을 사용합니다.
// public.courses 및 개발자가 등록한 데이터는 변경하지 않습니다.
@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class CourseRepositoryIntegrationTests {
    private lateinit var dataSource: SingleConnectionDataSource
    private lateinit var jdbc: JdbcTemplate
    private lateinit var repository: CourseRepository

    @BeforeEach
    fun setUp() {
        dataSource = SingleConnectionDataSource(
            System.getenv("DATABASE_URL") ?: "jdbc:postgresql://localhost:5432/running_course",
            System.getenv("DATABASE_USERNAME") ?: "running_course",
            System.getenv("DATABASE_PASSWORD") ?: "local_password",
            true,
        )
        jdbc = JdbcTemplate(dataSource)
        jdbc.execute("CREATE TEMP TABLE courses (LIKE public.courses INCLUDING ALL)")
        jdbc.execute("ALTER TABLE pg_temp.courses ADD COLUMN IF NOT EXISTS owner_id BIGINT")
        jdbc.execute("ALTER TABLE pg_temp.courses ADD COLUMN IF NOT EXISTS elevation_profile JSONB")
        jdbc.execute("CREATE TEMP TABLE course_bookmarks(user_id BIGINT NOT NULL, course_id BIGINT NOT NULL)")
        repository = CourseRepository(jdbc, JsonMapper.builder().build())
        insert("공개 첫 코스", true)
        insert("비공개 코스", false)
        insert("공개 두 번째 코스", true)
    }

    @AfterEach
    fun tearDown() {
        if (::dataSource.isInitialized) dataSource.destroy()
    }

    @Test
    fun `unified detail matches owner endpoint including editable private data`() {
        val id = requireNotNull(jdbc.queryForObject(
            "SELECT id FROM pg_temp.courses WHERE published = FALSE", Long::class.java))
        jdbc.update("UPDATE pg_temp.courses SET owner_id = 7, route_waypoints = route_geojson WHERE id = ?", id)
        val owned = OwnedCourseRepository(jdbc, JsonMapper.builder().build())
        assertEquals(requireNotNull(owned.findById(id, 7)), repository.findVisibleById(id, 7))
        assertNull(repository.findVisibleById(id, 8))
        assertNull(repository.findVisibleById(id, null))
        jdbc.update("INSERT INTO pg_temp.course_bookmarks(user_id, course_id) VALUES (7, ?)", id)
        assertEquals(requireNotNull(owned.findById(id, 7)), repository.findVisibleById(id, 7))
    }

    @Test
    fun `preview uses detail visibility for public owner bookmarked and unrelated viewers`() {
        val publicId = repository.findPublished(1, 0).single().id
        assertEquals(repository.findVisibleById(publicId, null)?.routeGeojson, repository.findVisiblePreview(publicId, null))
        val privateId = requireNotNull(jdbc.queryForObject(
            "SELECT id FROM pg_temp.courses WHERE published = FALSE", Long::class.java))
        jdbc.update("UPDATE pg_temp.courses SET owner_id = 7 WHERE id = ?", privateId)
        jdbc.update("INSERT INTO pg_temp.course_bookmarks(user_id, course_id) VALUES (8, ?)", privateId)
        assertNull(repository.findVisiblePreview(privateId, null))
        assertNull(repository.findVisiblePreview(privateId, 9))
        for (viewer in listOf(7L, 8L)) {
            val expected = requireNotNull(repository.findVisibleById(privateId, viewer)).routeGeojson
            assertEquals(expected, repository.findVisiblePreview(privateId, viewer))
        }
        assertNull(repository.findVisiblePreview(Long.MAX_VALUE, 7))
    }

    @Test
    fun `created route computes distance and remains private until owner publishes`() {
        val profile = ElevationProfile(
            samples = listOf(ElevationSample(0.0, 10.0, 10.0)),
            minElevationMeters = 10.0, maxElevationMeters = 10.0, ascentMeters = 0.0, descentMeters = 0.0,
            distanceMeters = 340.0, sampleIntervalMeters = 34.0,
            calculatedAt = java.time.Instant.parse("2026-01-01T00:00:00Z"),
            difficulty = ElevationDifficulty(ElevationDifficultyLevel.LOW, 0.0),
        )
        val editableWaypoints = RouteGeometry("LineString", listOf(
            listOf(126.934, 37.528), listOf(126.9345, 37.528),
            listOf(126.935, 37.529), listOf(126.934, 37.528),
        ))
        val request = CreateCourseRequest(" 새 코스 ", " 소개 ", CourseType.LOOP,
            RouteGeometry("LineString", listOf(listOf(126.934, 37.528), listOf(126.935, 37.528), listOf(126.935, 37.529), listOf(126.934, 37.528))),
            elevationProfile = profile, routeWaypoints = editableWaypoints)
        val mapper = JsonMapper.builder().build()
        val region = CourseRegion("서울특별시", "마포구", "공덕동")
        val created = CourseCreateService(CourseCreateRepository(jdbc, mapper), CourseRegionResolver { _, _ -> region }).create(request, 123)
        assertNull(repository.findVisibleById(created.id, null))
        val ownerService = OwnedCourseService(OwnedCourseRepository(jdbc, mapper), CourseRegionResolver { _, _ -> null })
        val detail = ownerService.detail(created.id, 123)
        assertEquals(false, detail.published)
        assertEquals("새 코스", detail.name)
        assertEquals("소개", detail.description)
        assertEquals(StartLocation(37.528, 126.934), detail.startLocation)
        assertEquals(region, detail.region)
        assertEquals(profile, detail.elevationProfile)
        org.junit.jupiter.api.Assertions.assertTrue(created.distanceMeters in 300..400)
        assertEquals(created.distanceMeters, detail.distanceMeters)
        assertEquals(4, detail.routeGeojson.get("coordinates").size())
        assertEquals(4, detail.routeWaypoints?.get("coordinates")?.size())
        assertEquals(126.9345, detail.routeWaypoints?.get("coordinates")?.get(1)?.get(0)?.doubleValue())
        ownerService.visibility(created.id, 123, true)
        assertEquals(region, repository.findVisibleById(created.id, null)?.region)
    }

    private fun insert(
        name: String, published: Boolean, distance: Int = 4800,
        longitude: Double = 126.934, latitude: Double = 37.528,
    ) {
        jdbc.update(
            """
            INSERT INTO courses (name, description, start_location, route_geojson, distance_meters, course_type, published)
            VALUES (?, '코스 상세 설명', ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
                    '{"type":"LineString","coordinates":[[126.934,37.528],[126.935,37.529],[126.934,37.528]]}'::jsonb,
                    ?, 'LOOP', ?)
            """.trimIndent(), name, longitude, latitude, distance, published,
        )
    }

    @Test
    fun `published filter ordering pagination and coordinate mapping work on PostGIS`() {
        assertEquals(2L, repository.countPublished())
        val first = repository.findPublished(1, 0).single()
        assertEquals("공개 첫 코스", first.name)
        assertEquals(StartLocation(37.528, 126.934), first.startLocation)
        assertEquals("공개 두 번째 코스", repository.findPublished(1, 1).single().name)
        assertEquals(emptyList<CourseSummary>(), repository.findPublished(1, 2))
    }

    @Test
    fun `no published courses returns empty collection`() {
        jdbc.update("UPDATE pg_temp.courses SET published = FALSE")
        assertEquals(0L, repository.countPublished())
        assertEquals(emptyList<CourseSummary>(), repository.findPublished(20, 0))
    }

    @Test
    fun `detail maps stored description and full GeoJSON without double encoding`() {
        val id = repository.findPublished(1, 0).single().id
        val detail = requireNotNull(repository.findVisibleById(id, null))
        assertEquals("공개 첫 코스", detail.name)
        assertEquals("코스 상세 설명", detail.description)
        assertEquals(4800, detail.distanceMeters)
        assertEquals(CourseType.LOOP, detail.courseType)
        assertEquals(StartLocation(37.528, 126.934), detail.startLocation)
        val expected = JsonMapper.builder().build().readTree(
            """{"type":"LineString","coordinates":[[126.934,37.528],[126.935,37.529],[126.934,37.528]]}""",
        )
        assertEquals(expected, detail.routeGeojson)
    }

    @Test
    fun `private and nonexistent courses both have no public detail`() {
        val privateId = requireNotNull(jdbc.queryForObject(
            "SELECT id FROM pg_temp.courses WHERE name = ?", Long::class.java, "비공개 코스",
        ))
        assertNull(repository.findVisibleById(privateId, null))
        assertNull(repository.findVisibleById(Long.MAX_VALUE, null))
    }

    @Test
    fun `private course detail is visible only to owner or existing bookmarker`() {
        val privateId = requireNotNull(jdbc.queryForObject(
            "SELECT id FROM pg_temp.courses WHERE name = ?", Long::class.java, "비공개 코스",
        ))
        jdbc.update("INSERT INTO course_bookmarks(user_id, course_id) VALUES (7, ?)", privateId)

        assertNull(repository.findVisibleById(privateId, null))
        assertNull(repository.findVisibleById(privateId, 8))
        assertEquals(privateId, repository.findVisibleById(privateId, 7)?.id)
        assertTrue(repository.findVisibleById(privateId, 7)?.isBookmarked == true)
    }

    @Test
    fun `nearby search excludes distant and private courses and orders by exact distance then id`() {
        jdbc.update("DELETE FROM pg_temp.courses")
        insert("먼 공개 코스", true, longitude = 126.944)
        insert("같은 출발점 첫 코스", true)
        insert("같은 출발점 두 번째 코스", true)
        insert("반경 밖 코스", true, longitude = 126.99)
        insert("가까운 비공개 코스", false)
        val search = CourseSearch(37.528, 126.934)
        val result = repository.findPublished(20, 0, search)
        assertEquals(listOf("같은 출발점 첫 코스", "같은 출발점 두 번째 코스", "먼 공개 코스"), result.map { it.name })
        assertEquals(0.0, result[0].distanceToStartMeters)
        org.junit.jupiter.api.Assertions.assertTrue(requireNotNull(result[2].distanceToStartMeters) in 800.0..1000.0)
        assertEquals(3L, repository.countPublished(search))
        assertEquals("먼 공개 코스", repository.findPublished(1, 2, search).single().name)
        assertEquals(emptyList<CourseSummary>(), repository.findPublished(1, 3, search))
    }

    @Test
    fun `distance tolerance includes boundaries and excludes outside values without requiring a location`() {
        jdbc.update("DELETE FROM pg_temp.courses")
        for (distance in listOf(4499, 4500, 5000, 5500, 5501)) insert("길이 $distance", true, distance)
        insert("비공개 길이 5000", false, 5000)
        val search = CourseSearch(targetDistanceMeters = 5000)
        val result = repository.findPublished(20, 0, search)
        assertEquals(listOf(4500, 5000, 5500), result.map { it.distanceMeters })
        assertEquals(3L, repository.countPublished(search))
        org.junit.jupiter.api.Assertions.assertTrue(result.all { it.distanceToStartMeters == null })
    }

    @Test
    fun `minimum distance filter returns courses over ten kilometers`() {
        jdbc.update("DELETE FROM pg_temp.courses")
        for (distance in listOf(9999, 10000, 10001, 12000)) insert("길이 $distance", true, distance)
        val search = CourseSearch(minimumDistanceMeters = 10001)
        assertEquals(listOf(10001, 12000), repository.findPublished(20, 0, search).map { it.distanceMeters })
        assertEquals(2L, repository.countPublished(search))
    }

    @Test
    fun `combined filters share the count and honor explicitly selected radius`() {
        jdbc.update("DELETE FROM pg_temp.courses")
        insert("근처 5km", true, 4800)
        insert("근처 10km", true, 10000)
        insert("멀리 5km", true, 5200, longitude = 126.944)
        val nearby = CourseSearch(37.528, 126.934, 100, 5000)
        assertEquals(listOf("근처 5km"), repository.findPublished(20, 0, nearby).map { it.name })
        assertEquals(1L, repository.countPublished(nearby))
        val wider = nearby.copy(radiusMeters = 2000)
        assertEquals(listOf("근처 5km", "멀리 5km"), repository.findPublished(20, 0, wider).map { it.name })
        assertEquals(2L, repository.countPublished(wider))
        val noMatch = wider.copy(targetDistanceMeters = 3000)
        assertEquals(0L, repository.countPublished(noMatch))
        assertEquals(emptyList<CourseSummary>(), repository.findPublished(20, 0, noMatch))
    }

    @Test
    fun `unfiltered listing keeps id ordering and no distance to start`() {
        val result = repository.findPublished(20, 0)
        org.junit.jupiter.api.Assertions.assertTrue(result.all { it.distanceToStartMeters == null })
        assertEquals(result.map { it.id }.sorted(), result.map { it.id })
    }

    @Test
    fun `owned course list includes bookmark and view counts with complete owner totals`() {
        val ids = jdbc.queryForList("SELECT id FROM pg_temp.courses ORDER BY id", Long::class.java)
        jdbc.update("UPDATE pg_temp.courses SET owner_id = 7, view_count = CASE id WHEN ? THEN 5 ELSE 2 END WHERE id IN (?, ?)", ids[0], ids[0], ids[2])
        jdbc.update("UPDATE pg_temp.courses SET owner_id = 7, view_count = 3 WHERE id = ?", ids[1])
        jdbc.update("INSERT INTO pg_temp.course_bookmarks(user_id, course_id) VALUES (1, ?), (2, ?), (1, ?)", ids[0], ids[0], ids[2])

        val ownedRepository = OwnedCourseRepository(jdbc, JsonMapper.builder().build())
        val courses = ownedRepository.findAll(7, 0, 6, "recent")
        assertEquals(listOf(ids[2], ids[1], ids[0]), courses.map { it.id })
        assertEquals(listOf(1L, 0L, 2L), courses.map { it.bookmarkCount })
        assertEquals(listOf(2L, 0L, 5L), courses.map { it.viewCount })
        assertEquals(listOf(CourseType.LOOP, CourseType.LOOP, CourseType.LOOP), courses.map { it.courseType })
        assertTrue(courses.all { it.createdAt.year > 2000 })
        assertEquals(MyCourseStats(3, 14400, 7, 3, 2, 1), ownedRepository.stats(7))
        assertEquals(MyCourseStats(0, 0, 0, 0, 0, 0), ownedRepository.stats(99))
        assertEquals(listOf(ids[0], ids[2], ids[1]), ownedRepository.findAll(7, 0, 6, "views").map { it.id })
        assertEquals(listOf(ids[0], ids[2], ids[1]), ownedRepository.findAll(7, 0, 6, "bookmarks").map { it.id })
        assertEquals(listOf(ids[2], ids[0]), ownedRepository.findAll(7, 0, 6, "recent").filter { it.published }.map { it.id })
    }

    @Test
    fun `view counts increment only for public courses`() {
        val publicId = repository.findPublished(1, 0).single().id
        val privateId = jdbc.queryForObject("SELECT id FROM pg_temp.courses WHERE name = ?", Long::class.java, "비공개 코스")!!
        assertTrue(repository.recordPublishedView(publicId))
        assertFalse(repository.recordPublishedView(privateId))
        assertEquals(1L, jdbc.queryForObject("SELECT view_count FROM pg_temp.courses WHERE id = ?", Long::class.java, publicId))
        assertEquals(0L, jdbc.queryForObject("SELECT view_count FROM pg_temp.courses WHERE id = ?", Long::class.java, privateId))
    }
}
