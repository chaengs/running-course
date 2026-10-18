package com.runningcourse.course

import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.Mockito.`when`
import org.mockito.Mockito.verifyNoInteractions
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import tools.jackson.databind.json.JsonMapper

@WebMvcTest(CourseController::class)
class CourseDetailControllerTests {
    @Autowired lateinit var mvc: MockMvc
    @MockitoBean lateinit var service: CourseService

    @Test
    fun `detail returns description and GeoJSON object with longitude first`() {
        val route = JsonMapper.builder().build().readTree(
            """{"type":"LineString","coordinates":[[126.934,37.528],[126.935,37.529],[126.934,37.528]]}""",
        )
        `when`(service.detail(1)).thenReturn(
            CourseDetail(1, "테스트 코스", "공개 코스 설명", 4800, CourseType.LOOP, StartLocation(37.528, 126.934), route),
        )
        mvc.perform(get("/api/courses/1"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.id").value(1))
            .andExpect(jsonPath("$.name").value("테스트 코스"))
            .andExpect(jsonPath("$.description").value("공개 코스 설명"))
            .andExpect(jsonPath("$.distanceMeters").value(4800))
            .andExpect(jsonPath("$.courseType").value("LOOP"))
            .andExpect(jsonPath("$.startLocation.latitude").value(37.528))
            .andExpect(jsonPath("$.startLocation.longitude").value(126.934))
            .andExpect(jsonPath("$.routeGeojson").isMap)
            .andExpect(jsonPath("$.routeGeojson.type").value("LineString"))
            .andExpect(jsonPath("$.routeGeojson.coordinates[0][0]").value(126.934))
            .andExpect(jsonPath("$.routeGeojson.coordinates[0][1]").value(37.528))
            .andExpect(jsonPath("$.published").value(true))
    }

    @Test
    fun `unavailable course returns safe not found problem response`() {
        `when`(service.detail(99)).thenThrow(CourseNotFoundException())
        mvc.perform(get("/api/courses/99"))
            .andExpect(status().isNotFound)
            .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
            .andExpect(jsonPath("$.status").value(404))
            .andExpect(jsonPath("$.detail").value("코스를 찾을 수 없습니다."))
    }

    @ParameterizedTest
    @ValueSource(strings = ["0", "-1", "abc", "1.5", "9223372036854775808"])
    fun `invalid course id is rejected before service is called`(id: String) {
        mvc.perform(get("/api/courses/$id")).andExpect(status().isBadRequest)
        verifyNoInteractions(service)
    }
}
