package com.runningcourse.auth

import com.runningcourse.course.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.datasource.SingleConnectionDataSource
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.json.JsonMapper

@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class AuthOwnershipIntegrationTests {
    private lateinit var source: SingleConnectionDataSource
    private lateinit var jdbc: JdbcTemplate
    private lateinit var auth: AuthService
    private lateinit var owned: OwnedCourseService
    private lateinit var create: CourseCreateService
    private lateinit var publicCourses: CourseRepository
    private val password = "test-password-123"
    private val request = CreateCourseRequest(" 나의 코스 ", "설명", CourseType.LOOP, RouteGeometry("LineString", listOf(
        listOf(126.934,37.528), listOf(126.935,37.528), listOf(126.935,37.529), listOf(126.934,37.528))))

    @BeforeEach fun setup() {
        source = SingleConnectionDataSource(System.getenv("DATABASE_URL") ?: "jdbc:postgresql://localhost:5432/running_course",
            System.getenv("DATABASE_USERNAME") ?: "running_course", System.getenv("DATABASE_PASSWORD") ?: "local_password", true)
        jdbc = JdbcTemplate(source)
        jdbc.execute("CREATE TEMP TABLE app_users(id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY, email VARCHAR(254) UNIQUE NOT NULL, display_name VARCHAR(40) NOT NULL, password_hash VARCHAR(100) NOT NULL)")
        jdbc.execute("CREATE TEMP TABLE user_sessions(token_hash CHAR(64) PRIMARY KEY, user_id BIGINT NOT NULL, expires_at TIMESTAMPTZ NOT NULL)")
        jdbc.execute("CREATE TEMP TABLE courses(LIKE public.courses INCLUDING ALL)")
        jdbc.execute("ALTER TABLE pg_temp.courses ADD COLUMN IF NOT EXISTS owner_id BIGINT")
        val mapper = JsonMapper.builder().build()
        auth = AuthService(jdbc)
        owned = OwnedCourseService(jdbc, mapper)
        create = CourseCreateService(CourseCreateRepository(jdbc, mapper))
        publicCourses = CourseRepository(jdbc, mapper)
    }
    @AfterEach fun cleanup() { if (::source.isInitialized) source.destroy() }
    private fun register(email: String) = auth.register(Credentials(email, password, "러너"))
    private fun status(code: Int, block: () -> Unit) {
        assertEquals(code, assertThrows(ResponseStatusException::class.java) { block() }.statusCode.value())
    }

    @Test fun `registration hashes password normalizes email and session is hashed expiring and revocable`() {
        val result = register(" Runner@Example.com ")
        assertEquals("runner@example.com", result.user.email)
        assertEquals(result.user, auth.requireUser("Bearer ${result.token}"))
        assertNotEquals(password, jdbc.queryForObject("SELECT password_hash FROM app_users", String::class.java))
        assertNotEquals(result.token, jdbc.queryForObject("SELECT token_hash FROM user_sessions", String::class.java))
        status(409) { register("runner@example.com") }
        status(401) { auth.login(Credentials("runner@example.com", "incorrect-password"), null) }
        status(401) { auth.login(Credentials("absent@example.com", password), null) }
        val login = auth.login(Credentials("runner@example.com", password), "Bearer ${result.token}")
        assertNull(auth.current("Bearer ${result.token}"))
        auth.logout("Bearer ${login.token}")
        status(401) { auth.requireUser("Bearer ${login.token}") }
        val expired = auth.login(Credentials("runner@example.com", password), null)
        jdbc.update("UPDATE user_sessions SET expires_at = CURRENT_TIMESTAMP - INTERVAL '1 second'")
        assertNull(auth.current("Bearer ${expired.token}"))
    }

    @Test fun `invalid credentials never create users`() {
        for (credentials in listOf(Credentials("bad", password, "러너"), Credentials("a@example.com", "short", "러너"), Credentials("a@example.com", "가".repeat(30), "러너"), Credentials("a@example.com", password, " "))) {
            status(400) { auth.register(credentials) }
        }
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM app_users", Int::class.java))
    }

    @Test fun `only owner reads private route updates publishes hides and deletes it`() {
        val a = register("a@example.com").user.id
        val b = register("b@example.com").user.id
        val created = create.create(request, a)
        assertTrue(created.distanceMeters in 300..400)
        assertEquals(a, owned.detail(created.id, a).ownerId)
        assertFalse(owned.detail(created.id, a).published)
        assertNull(publicCourses.findPublishedById(created.id))
        assertEquals(0, publicCourses.countPublished())
        assertTrue(owned.list(b).isEmpty())
        status(404) { owned.detail(created.id, b) }
        status(404) { owned.update(created.id, b, request.copy(name = "침입")) }
        status(404) { owned.visibility(created.id, b, true) }
        status(404) { owned.delete(created.id, b) }
        owned.update(created.id, a, request.copy(name = "수정된 코스"))
        assertEquals("수정된 코스", owned.detail(created.id, a).name)
        owned.visibility(created.id, a, true)
        assertNotNull(publicCourses.findPublishedById(created.id))
        assertEquals(1, publicCourses.countPublished())
        owned.visibility(created.id, a, false)
        assertNull(publicCourses.findPublishedById(created.id))
        owned.delete(created.id, a)
        assertTrue(owned.list(a).isEmpty())
        status(404) { owned.detail(created.id, a) }
    }
}
