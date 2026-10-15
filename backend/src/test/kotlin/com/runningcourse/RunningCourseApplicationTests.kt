package com.runningcourse

import com.runningcourse.health.HealthController
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.mockito.Mockito.mock
import org.mockito.Mockito.`when`
import org.springframework.jdbc.core.JdbcTemplate

class RunningCourseApplicationTests {
    @Test
    fun `health checks PostGIS connectivity`() {
        val jdbc = mock(JdbcTemplate::class.java)
        `when`(jdbc.queryForObject("SELECT PostGIS_Lib_Version()", String::class.java)).thenReturn("3.5")
        val result = HealthController(jdbc).health()
        assertEquals("UP", result.database)
        assertEquals("3.5", result.postgisVersion)
    }
}
