package com.runningcourse.course

import com.runningcourse.auth.AuthService
import com.runningcourse.auth.UserView
import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.mockito.Mockito.verify
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.http.HttpStatus
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status
import org.springframework.web.server.ResponseStatusException

@WebMvcTest(KakaoAddressSearchController::class)
class KakaoAddressSearchControllerTests {
    @Autowired lateinit var mvc: MockMvc
    @MockitoBean lateinit var auth: AuthService
    @MockitoBean lateinit var service: KakaoAddressSearchService

    @Test
    fun `search requires a user and returns address coordinates`() {
        `when`(auth.requireUser("Bearer test")).thenReturn(UserView(1, "runner@example.com", "러너"))
        `when`(service.search("서울 마포구")).thenReturn(
            listOf(AddressSearchResult("서울 마포구 월드컵로 1", "서울 마포구 월드컵로 1", 37.5683, 126.8982)),
        )

        mvc.perform(get("/api/my/addresses/search").param("query", " 서울 마포구 ").header("Authorization", "Bearer test"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.results[0].addressName").value("서울 마포구 월드컵로 1"))
            .andExpect(jsonPath("$.results[0].latitude").value(37.5683))
            .andExpect(jsonPath("$.results[0].longitude").value(126.8982))

        verify(service).search("서울 마포구")
    }

    @Test
    fun `invalid query is rejected before upstream lookup`() {
        `when`(auth.requireUser("Bearer test")).thenReturn(UserView(1, "runner@example.com", "러너"))

        mvc.perform(get("/api/my/addresses/search").param("query", "a").header("Authorization", "Bearer test"))
            .andExpect(status().isBadRequest)

        verifyNoInteractions(service)
    }

    @Test
    fun `anonymous search is rejected before upstream lookup`() {
        `when`(auth.requireUser(null)).thenThrow(ResponseStatusException(HttpStatus.UNAUTHORIZED))

        mvc.perform(get("/api/my/addresses/search").param("query", "서울 마포구"))
            .andExpect(status().isUnauthorized)

        verifyNoInteractions(service)
    }
}
