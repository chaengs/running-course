package com.runningcourse.course

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.datasource.SingleConnectionDataSource
import org.springframework.jdbc.datasource.DataSourceTransactionManager
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.json.JsonMapper

@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class CourseBookmarkIntegrationTests {
    private lateinit var source: SingleConnectionDataSource
    private lateinit var jdbc: JdbcTemplate
    private lateinit var service: CourseBookmarkService
    private lateinit var transaction: TransactionTemplate
    private var courseId = 0L

    @BeforeEach fun setup() {
        source = SingleConnectionDataSource(System.getenv("DATABASE_URL") ?: "jdbc:postgresql://localhost:5432/running_course",
            System.getenv("DATABASE_USERNAME") ?: "running_course", System.getenv("DATABASE_PASSWORD") ?: "local_password", true)
        jdbc = JdbcTemplate(source)
        jdbc.execute("CREATE TEMP TABLE app_users(id BIGINT PRIMARY KEY)")
        jdbc.execute("INSERT INTO app_users VALUES (1), (2)")
        jdbc.execute("CREATE TEMP TABLE courses(LIKE public.courses INCLUDING ALL)")
        val migration = javaClass.getResource("/db/migration/V3__create_course_bookmarks.sql")!!.readText()
        migration.replace("CREATE TABLE course_bookmarks", "CREATE TEMP TABLE course_bookmarks")
            .split(';').filter { it.isNotBlank() }.forEach { jdbc.execute(it) }
        val create = CourseCreateRepository(jdbc, JsonMapper.builder().build())
        courseId = create.insert(CreateCourseRequest("북마크 테스트", "", CourseType.LOOP, RouteGeometry("LineString", listOf(
            listOf(126.934,37.528), listOf(126.935,37.528), listOf(126.935,37.529), listOf(126.934,37.528)))), 1)!!.id
        jdbc.update("UPDATE courses SET published = TRUE WHERE id = ?", courseId)
        service = CourseBookmarkService(CourseBookmarkRepository(jdbc))
        transaction = TransactionTemplate(DataSourceTransactionManager(source))
    }

    @AfterEach fun cleanup() { if (::source.isInitialized) source.destroy() }
    private fun bookmarked(userId: Long) = transaction.execute { service.status(userId, courseId).bookmarked }

    @Test fun `add and remove are idempotent and isolated by user`() {
        assertFalse(bookmarked(1))
        transaction.executeWithoutResult { service.add(1, courseId); service.add(1, courseId) }
        assertTrue(bookmarked(1))
        assertFalse(bookmarked(2))
        transaction.executeWithoutResult { service.add(2, courseId); service.remove(1, courseId); service.remove(1, courseId) }
        assertFalse(bookmarked(1))
        assertTrue(bookmarked(2))
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM course_bookmarks", Int::class.java))
    }

    @Test fun `private and missing courses cannot be bookmarked or inspected`() {
        jdbc.update("UPDATE courses SET published = FALSE WHERE id = ?", courseId)
        for (id in listOf(courseId, Long.MAX_VALUE)) {
            assertEquals(404, assertThrows(ResponseStatusException::class.java) {
                transaction.executeWithoutResult { service.add(1, id) }
            }.statusCode.value())
            assertEquals(404, assertThrows(ResponseStatusException::class.java) {
                transaction.executeWithoutResult { service.status(1, id) }
            }.statusCode.value())
        }
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM course_bookmarks", Int::class.java))
    }

    @Test fun `hidden bookmarks can be removed and deleted courses cascade`() {
        transaction.executeWithoutResult { service.add(1, courseId); service.add(2, courseId) }
        jdbc.update("UPDATE courses SET published = FALSE WHERE id = ?", courseId)
        transaction.executeWithoutResult { service.remove(1, courseId) }
        jdbc.update("DELETE FROM courses WHERE id = ?", courseId)
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM course_bookmarks", Int::class.java))
        transaction.executeWithoutResult { service.remove(2, courseId) }
    }

    @Test fun `deleting a user cascades only their bookmarks`() {
        transaction.executeWithoutResult { service.add(1, courseId); service.add(2, courseId) }
        jdbc.update("DELETE FROM app_users WHERE id = 1")
        assertTrue(bookmarked(2))
        assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM course_bookmarks", Int::class.java))
    }

    @Test fun `list contains only current users public courses and hides unpublished or deleted ones`() {
        transaction.executeWithoutResult { service.add(1, courseId) }
        assertEquals(listOf(courseId), service.list(1, 0).content.map { it.id })
        assertTrue(service.list(2, 0).content.isEmpty())
        jdbc.update("UPDATE courses SET published = FALSE WHERE id = ?", courseId)
        assertTrue(service.list(1, 0).content.isEmpty())
        jdbc.update("UPDATE courses SET published = TRUE WHERE id = ?", courseId)
        assertEquals(listOf(courseId), service.list(1, 0).content.map { it.id })
        jdbc.update("DELETE FROM courses WHERE id = ?", courseId)
        assertTrue(service.list(1, 0).content.isEmpty())
    }

    @Test fun `list paginates with deterministic order and validates page bounds`() {
        val ids = (1..21).map {
            jdbc.queryForObject("""
                INSERT INTO courses(name, start_location, route_geojson, distance_meters, course_type, published)
                SELECT name, start_location, route_geojson, distance_meters, course_type, published
                FROM courses WHERE id = ? RETURNING id
            """.trimIndent(), Long::class.java, courseId)!!
        }
        ids.forEach { jdbc.update("INSERT INTO course_bookmarks(user_id, course_id, created_at) VALUES (1, ?, '2026-01-01T00:00:00Z')", it) }
        val first = service.list(1, 0)
        val second = service.list(1, 1)
        assertEquals(ids.reversed().take(20), first.content.map { it.id })
        assertTrue(first.hasNext)
        assertEquals(listOf(ids.first()), second.content.map { it.id })
        assertFalse(second.hasNext)
        assertFalse(service.list(1, 2).hasNext)
        for (page in listOf(-1, 100001)) assertEquals(400, assertThrows(ResponseStatusException::class.java) { service.list(1, page) }.statusCode.value())
        // Timestamp takes precedence over the tie breaker on course ID.
        jdbc.update("UPDATE course_bookmarks SET created_at = '2026-01-02T00:00:00Z' WHERE course_id = ?", ids.first())
        assertEquals(ids.first(), service.list(1, 0).content.first().id)
    }
}
