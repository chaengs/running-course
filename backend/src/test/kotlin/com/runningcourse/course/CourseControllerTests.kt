package com.runningcourse.course

import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.Mockito.`when`
import org.mockito.Mockito.verify
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.status

@WebMvcTest(CourseController::class)
class CourseControllerTests {
    @Autowired lateinit var mvc: MockMvc
    @MockitoBean lateinit var service: CourseService

    @Test
    fun `default list returns summary without full route`() {
        val item = CourseSummary(1, "테스트 코스", 4800, CourseType.LOOP, StartLocation(37.528, 126.934))
        `when`(service.list(0, 20)).thenReturn(CourseListResponse(listOf(item), 0, 20, 1, 1))
        mvc.perform(get("/api/courses"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].id").value(1))
            .andExpect(jsonPath("$.content[0].courseType").value("LOOP"))
            .andExpect(jsonPath("$.content[0].distanceMeters").value(4800))
            .andExpect(jsonPath("$.content[0].startLocation.latitude").value(37.528))
            .andExpect(jsonPath("$.content[0].startLocation.longitude").value(126.934))
            .andExpect(jsonPath("$.content[0].routeGeojson").doesNotExist())
            .andExpect(jsonPath("$.totalElements").value(1))
    }

    @Test
    fun `page parameters are passed through and empty page is successful`() {
        `when`(service.list(2, 2)).thenReturn(CourseListResponse(emptyList(), 2, 2, 4, 2))
        mvc.perform(get("/api/courses").param("page", "2").param("size", "2"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content").isEmpty)
            .andExpect(jsonPath("$.page").value(2))
            .andExpect(jsonPath("$.size").value(2))
        verify(service).list(2, 2)
    }

    @ParameterizedTest
    @ValueSource(strings = ["page=-1", "size=0", "size=-1", "size=101", "page=abc", "size=abc", "page=2147483648"])
    fun `invalid pagination returns bad request`(query: String) {
        mvc.perform(get("/api/courses?$query")).andExpect(status().isBadRequest)
    }
}
