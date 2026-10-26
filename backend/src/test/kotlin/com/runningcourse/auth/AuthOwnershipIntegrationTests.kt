package com.runningcourse.auth

import com.runningcourse.course.*
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.datasource.SingleConnectionDataSource
import org.springframework.jdbc.datasource.DataSourceTransactionManager
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.transaction.support.TransactionTemplate
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
        jdbc.execute("CREATE TEMP TABLE course_bookmarks(user_id BIGINT NOT NULL, course_id BIGINT NOT NULL)")
        val mapper = JsonMapper.builder().build()
        auth = AuthService(AuthRepository(jdbc))
        val noGeocoding = CourseRegionResolver { _, _ -> null }
        owned = OwnedCourseService(OwnedCourseRepository(jdbc, mapper), noGeocoding)
        create = CourseCreateService(CourseCreateRepository(jdbc, mapper), noGeocoding)
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
        for (credentials in listOf(Credentials("bad", password, "러너"), Credentials("a@example.com", "short", "러너"), Credentials("a@example.com", "가".repeat(16), "러너"), Credentials("a@example.com", password, " "))) {
            status(400) { auth.register(credentials) }
        }
        assertEquals(0, jdbc.queryForObject("SELECT COUNT(*) FROM app_users", Int::class.java))
    }

    @Test fun `password length uses characters and supports multibyte passwords`() {
        val password = "가".repeat(15)
        val result = auth.register(Credentials("long-password@example.com", password, "러너"))
        assertEquals(result.user, auth.login(Credentials("long-password@example.com", password), null).user)
        status(400) { auth.register(Credentials("too-long@example.com", "가".repeat(16), "러너")) }
    }

    @Test fun `existing accounts with passwords longer than the registration limit can still login`() {
        val legacyPassword = "legacy-password-123"
        val legacyHash = BCryptPasswordEncoder(12).encode(legacyPassword)
        jdbc.update(
            "INSERT INTO app_users(email, display_name, password_hash) VALUES (?, ?, ?)",
            "legacy@example.com", "기존 러너", legacyHash,
        )

        assertEquals("legacy@example.com", auth.login(Credentials("legacy@example.com", legacyPassword), null).user.email)
    }

    @Test fun `duplicate email returns no row without aborting PostgreSQL transaction`() {
        val repository = AuthRepository(jdbc)
        TransactionTemplate(DataSourceTransactionManager(source)).executeWithoutResult {
            val first = repository.insertUser("unique@example.com", "첫 러너", "test-hash")
            assertNotNull(first)
            assertNull(repository.insertUser("unique@example.com", "중복 러너", "different-hash"))
            assertEquals(1, jdbc.queryForObject("SELECT COUNT(*) FROM app_users", Int::class.java))
            assertEquals("첫 러너", repository.findCredentials("unique@example.com")?.user?.displayName)
        }
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
        assertTrue(owned.list(b, 0, "all", "recent").content.isEmpty())
        status(404) { owned.detail(created.id, b) }
        status(404) { owned.update(created.id, b, request.copy(name = "침입")) }
        status(404) { owned.visibility(created.id, b, true) }
        status(404) { owned.delete(created.id, b) }
        owned.recordView(created.id, a)
        assertEquals(0L, owned.list(a, 0, "all", "recent").content.single().viewCount)
        assertEquals(0L, owned.list(a, 0, "all", "recent").stats.totalViews)
        assertEquals(0L, jdbc.queryForObject("SELECT view_count FROM pg_temp.courses WHERE id = ?", Long::class.java, created.id))
        owned.recordView(created.id, b)
        assertEquals(0L, owned.list(a, 0, "all", "recent").content.single().viewCount)
        assertThrows(CourseNotFoundException::class.java) { CourseService(publicCourses).recordView(created.id) }
        owned.update(created.id, a, request.copy(name = "수정된 코스"))
        assertEquals("수정된 코스", owned.detail(created.id, a).name)
        owned.visibility(created.id, a, true)
        assertNotNull(publicCourses.findPublishedById(created.id))
        CourseService(publicCourses).recordView(created.id)
        assertEquals(1L, owned.list(a, 0, "all", "recent").content.single().viewCount)
        assertEquals(1L, owned.list(a, 0, "all", "recent").stats.totalViews)
        assertEquals(1, publicCourses.countPublished())
        owned.visibility(created.id, a, false)
        assertNull(publicCourses.findPublishedById(created.id))
        assertThrows(CourseNotFoundException::class.java) { CourseService(publicCourses).recordView(created.id) }
        owned.recordView(created.id, a)
        assertEquals(0L, owned.list(a, 0, "all", "recent").content.single().viewCount)
        assertEquals(0L, owned.list(a, 0, "all", "recent").stats.totalViews)
        owned.delete(created.id, a)
        assertTrue(owned.list(a, 0, "all", "recent").content.isEmpty())
        status(404) { owned.detail(created.id, a) }
    }

    @Test fun `creation selects visibility and edits persist visibility with course content`() {
        val owner = register("visibility@example.com").user.id
        val other = register("other-visibility@example.com").user.id
        val defaultPrivate = create.create(request, owner)
        assertFalse(owned.detail(defaultPrivate.id, owner).published)
        val published = create.create(request.copy(published = true), owner)
        assertNotNull(publicCourses.findPublishedById(published.id))
        owned.update(published.id, owner, request.copy(name = "공개 유지"))
        assertTrue(owned.detail(published.id, owner).published)
        owned.update(published.id, owner, request.copy(name = "비공개로 수정", published = false))
        assertEquals("비공개로 수정", owned.detail(published.id, owner).name)
        assertNull(publicCourses.findPublishedById(published.id))
        status(404) { owned.update(published.id, other, request.copy(published = true)) }
        assertFalse(owned.detail(published.id, owner).published)
        owned.update(published.id, owner, request.copy(published = true))
        assertNotNull(publicCourses.findPublishedById(published.id))
        // Valid coordinates but >100km: neither content nor visibility should change.
        val tooLong = RouteGeometry("LineString", listOf(listOf(126.0,37.0), listOf(128.0,37.0), listOf(128.0,39.0), listOf(126.0,37.0)))
        status(400) { owned.update(published.id, owner, request.copy(name = "저장되면 안 됨", published = false, routeGeojson = tooLong)) }
        assertTrue(owned.detail(published.id, owner).published)
        assertNotEquals("저장되면 안 됨", owned.detail(published.id, owner).name)
        val explicitPrivate = create.create(request.copy(published = false), owner)
        assertNull(publicCourses.findPublishedById(explicitPrivate.id))
    }
}
