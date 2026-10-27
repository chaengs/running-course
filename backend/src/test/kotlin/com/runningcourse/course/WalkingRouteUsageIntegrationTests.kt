package com.runningcourse.course

import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.jdbc.datasource.SingleConnectionDataSource
import org.springframework.jdbc.datasource.DataSourceTransactionManager
import org.springframework.transaction.support.TransactionTemplate
import java.time.LocalDate

@EnabledIfEnvironmentVariable(named = "RUN_DB_TESTS", matches = "true")
class WalkingRouteUsageIntegrationTests {
    private lateinit var source: SingleConnectionDataSource
    private lateinit var jdbc: JdbcTemplate
    private lateinit var repository: WalkingRouteUsageRepository
    private lateinit var transaction: TransactionTemplate
    private val date = LocalDate.of(2026, 10, 27)

    @BeforeEach fun setup() {
        source = SingleConnectionDataSource(
            System.getenv("DATABASE_URL") ?: "jdbc:postgresql://localhost:5432/running_course",
            System.getenv("DATABASE_USERNAME") ?: "running_course",
            System.getenv("DATABASE_PASSWORD") ?: "local_password", true,
        )
        jdbc = JdbcTemplate(source)
        val migration = requireNotNull(javaClass.getResource("/db/migration/V11__add_walking_route_daily_usage.sql")).readText()
        migration.replace("CREATE TABLE walking_route_daily_usage", "CREATE TEMP TABLE walking_route_daily_usage")
            .split(';').filter { it.isNotBlank() }.forEach { jdbc.execute(it) }
        repository = WalkingRouteUsageRepository(jdbc)
        transaction = TransactionTemplate(DataSourceTransactionManager(source))
    }

    @AfterEach fun cleanup() { if (::source.isInitialized) source.destroy() }
    private fun seed(scope: String, subject: Long, count: Int) {
        jdbc.update("INSERT INTO pg_temp.walking_route_daily_usage VALUES (?, ?, ?, ?)", date, scope, subject, count)
    }
    private fun reserve(user: Long = 7, userLimit: Int = 800, day: LocalDate = date) {
        transaction.executeWithoutResult { repository.reserve(day, user, userLimit, 900) }
    }
    private fun count(scope: String, subject: Long): Int? = jdbc.query(
        "SELECT request_count FROM pg_temp.walking_route_daily_usage WHERE usage_date = ? AND quota_scope = ? AND subject_id = ?",
        { rs, _ -> rs.getInt(1) }, date, scope, subject,
    ).singleOrNull()

    @Test fun `old cap no longer blocks 101st request`() {
        seed("USER", 7, 100); seed("GLOBAL", 0, 100)
        reserve()
        assertEquals(101, count("USER", 7)); assertEquals(101, count("GLOBAL", 0))
    }
    @Test fun `last request succeeds and user overflow does not change counts`() {
        seed("USER", 7, 799); seed("GLOBAL", 0, 799)
        reserve()
        val error = assertThrows(WalkingRouteLimitExceededException::class.java) { reserve() }
        assertEquals("USER_DAILY_LIMIT_EXCEEDED", error.code)
        assertEquals(800, error.limit)
        assertEquals(800, count("USER", 7)); assertEquals(800, count("GLOBAL", 0))
        assertEquals("2026-10-28T00:00+09:00", error.resetsAt.toString())
    }
    @Test fun `global 900th request succeeds and 901st fails for another user`() {
        seed("GLOBAL", 0, 899)
        reserve(user = 8)
        assertEquals(900, count("GLOBAL", 0))
        val error = assertThrows(WalkingRouteLimitExceededException::class.java) { reserve(user = 9) }
        assertEquals("GLOBAL_DAILY_LIMIT_EXCEEDED", error.code)
        assertEquals(900, error.limit)
        assertNull(count("USER", 9))
        assertEquals(900, count("GLOBAL", 0))
    }
    @Test fun `global overflow rolls back existing user increment`() {
        seed("USER", 7, 10); seed("GLOBAL", 0, 900)
        val error = assertThrows(WalkingRouteLimitExceededException::class.java) { reserve() }
        assertEquals("GLOBAL_DAILY_LIMIT_EXCEEDED", error.code)
        assertEquals(900, error.limit)
        assertEquals(10, count("USER", 7)); assertEquals(900, count("GLOBAL", 0))
    }
    @Test fun `global overflow rolls back new user row`() {
        seed("GLOBAL", 0, 900)
        assertThrows(WalkingRouteLimitExceededException::class.java) { reserve(user = 8) }
        assertNull(count("USER", 8))
    }
    @Test fun `custom limit respected and next date has fresh quota`() {
        seed("USER", 7, 200); seed("GLOBAL", 0, 200)
        val error = assertThrows(WalkingRouteLimitExceededException::class.java) { reserve(userLimit = 200) }
        assertEquals(200, error.limit)
        reserve(day = date.plusDays(1))
        assertEquals(200, count("USER", 7)); assertEquals(200, count("GLOBAL", 0))
    }
}
