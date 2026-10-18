package com.runningcourse.course

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
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
    fun `created route computes distance and remains private until owner publishes`() {
        val request = CreateCourseRequest(" 새 코스 ", " 소개 ", CourseType.LOOP,
            RouteGeometry("LineString", listOf(listOf(126.934, 37.528), listOf(126.935, 37.528), listOf(126.935, 37.529), listOf(126.934, 37.528))))
        val mapper = JsonMapper.builder().build()
        val created = CourseCreateService(CourseCreateRepository(jdbc, mapper)).create(request, 123)
        assertNull(repository.findPublishedById(created.id))
        val detail = OwnedCourseService(jdbc, mapper).detail(created.id, 123)
        assertEquals(false, detail.published)
        assertEquals("새 코스", detail.name)
        assertEquals("소개", detail.description)
        assertEquals(StartLocation(37.528, 126.934), detail.startLocation)
        org.junit.jupiter.api.Assertions.assertTrue(created.distanceMeters in 300..400)
        assertEquals(created.distanceMeters, detail.distanceMeters)
        assertEquals(4, detail.routeGeojson.get("coordinates").size())
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
        val detail = requireNotNull(repository.findPublishedById(id))
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
        assertNull(repository.findPublishedById(privateId))
        assertNull(repository.findPublishedById(Long.MAX_VALUE))
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
}
