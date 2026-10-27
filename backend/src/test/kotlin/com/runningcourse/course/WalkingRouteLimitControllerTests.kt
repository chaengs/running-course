package com.runningcourse.course

import com.runningcourse.auth.AuthService
import com.runningcourse.auth.UserView
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.CsvSource
import org.mockito.Mockito.`when`
import org.mockito.Mockito.doThrow
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.context.annotation.Import
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import java.time.LocalDate

@WebMvcTest(controllers = [KakaoWalkingRouteController::class], properties = ["geocoding.kakao.rest-api-key=test-key"])
@Import(WalkingRouteCache::class, WalkingRouteExceptionHandler::class)
class WalkingRouteLimitControllerTests {
    @Autowired lateinit var mvc: MockMvc
    @MockitoBean lateinit var auth: AuthService
    @MockitoBean lateinit var usage: WalkingRouteUsageService

    @ParameterizedTest
    @CsvSource(
        "/api/walking-routes/segment, USER, USER_DAILY_LIMIT_EXCEEDED, 사용자 일일 한도 초과",
        "/api/walking-routes/segment, GLOBAL, GLOBAL_DAILY_LIMIT_EXCEEDED, 서비스 전체 일일 한도 초과",
        "/api/test/kakao-walking, USER, USER_DAILY_LIMIT_EXCEEDED, 사용자 일일 한도 초과",
        "/api/test/kakao-walking, GLOBAL, GLOBAL_DAILY_LIMIT_EXCEEDED, 서비스 전체 일일 한도 초과",
    )
    fun `both endpoints return distinct limit errors`(path: String, scope: WalkingRouteQuotaScope, code: String, message: String) {
        `when`(auth.requireUser("Bearer token")).thenReturn(UserView(7, "runner@example.com", "runner"))
        val limit = if (scope == WalkingRouteQuotaScope.USER) 800 else 900
        doThrow(WalkingRouteLimitExceededException(scope, limit, LocalDate.of(2026, 10, 27))).`when`(usage).reserve(7)
        mvc.perform(post(path).header("Authorization", "Bearer token").contentType("application/json")
            .content("""{"points":[{"latitude":37.528,"longitude":126.934},{"latitude":37.529,"longitude":126.935}]}"""))
            .andExpect(status().isTooManyRequests)
            .andExpect(jsonPath("$.status").value(429))
            .andExpect(jsonPath("$.code").value(code))
            .andExpect(jsonPath("$.scope").value(scope.name))
            .andExpect(jsonPath("$.limit").value(limit))
            .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.startsWith(message)))
            .andExpect(jsonPath("$.resetsAt").value("2026-10-28T00:00:00+09:00"))
    }
}
