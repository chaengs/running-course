package com.runningcourse.course

import org.junit.jupiter.api.Test
import org.mockito.Mockito.`when`
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@WebMvcTest(CourseRegionController::class)
class CourseRegionControllerTests {
    @Autowired lateinit var mvc: MockMvc
    @MockitoBean lateinit var resolver: CourseRegionResolver

    @Test
    fun `reverse geocodes a validated coordinate`() {
        `when`(resolver.resolve(37.528, 126.934)).thenReturn(
            CourseRegion(
                sido = "서울특별시",
                sigungu = "마포구",
                eupMyeonDong = "서교동",
            ),
        )

        mvc.perform(get("/api/regions/reverse").param("latitude", "37.528").param("longitude", "126.934"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.region.sido").value("서울특별시"))
            .andExpect(jsonPath("$.region.sigungu").value("마포구"))
            .andExpect(jsonPath("$.region.eupMyeonDong").value("서교동"))
    }

    @Test
    fun `out of range coordinate is rejected before geocoding`() {
        mvc.perform(get("/api/regions/reverse").param("latitude", "91").param("longitude", "126.934"))
            .andExpect(status().isBadRequest)
        verifyNoInteractions(resolver)
    }
}
