package com.runningcourse.course

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertEquals
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
        repository = CourseRepository(jdbc)
        insert("공개 첫 코스", true)
        insert("비공개 코스", false)
        insert("공개 두 번째 코스", true)
    }

    @AfterEach
    fun tearDown() {
        if (::dataSource.isInitialized) dataSource.destroy()
    }

    private fun insert(name: String, published: Boolean) {
        jdbc.update(
            """
            INSERT INTO courses (name, start_location, route_geojson, distance_meters, course_type, published)
            VALUES (?, ST_SetSRID(ST_MakePoint(126.934, 37.528), 4326)::geography,
                    '{"type":"LineString","coordinates":[[126.934,37.528],[126.935,37.529],[126.934,37.528]]}'::jsonb,
                    4800, 'LOOP', ?)
            """.trimIndent(), name, published,
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
}
