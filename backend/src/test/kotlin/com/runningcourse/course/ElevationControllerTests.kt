package com.runningcourse.course

import com.runningcourse.auth.AuthService
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.http.HttpStatus
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.web.server.ResponseStatusException

@WebMvcTest(ElevationController::class)
class ElevationControllerTests {
    @Autowired lateinit var mvc: MockMvc
    @MockitoBean lateinit var auth: AuthService
    @MockitoBean lateinit var service: ElevationService

    @Test fun `anonymous callers never invoke elevation provider`() {
        `when`(auth.requireUser(null)).thenThrow(ResponseStatusException(HttpStatus.UNAUTHORIZED))
        mvc.perform(post("/api/my/elevation").contentType("application/json")
            .content("""{"routeGeojson":{"type":"LineString","coordinates":[[126,37],[126.01,37]]}}"""))
            .andExpect(status().isUnauthorized)
        verifyNoInteractions(service)
    }
}
