package com.runningcourse.health

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RestController

@RestController
class HealthController(private val jdbcTemplate: JdbcTemplate) {
    @GetMapping("/api/health")
    fun health(): HealthResponse {
        val postgisVersion = jdbcTemplate.queryForObject("SELECT PostGIS_Lib_Version()", String::class.java)
        return HealthResponse("UP", "running-course", "UP", postgisVersion)
    }
}

data class HealthResponse(
    val status: String,
    val service: String,
    val database: String,
    val postgisVersion: String?,
)
