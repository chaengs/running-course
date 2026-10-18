package com.runningcourse.course

import org.junit.jupiter.api.Test
import org.junit.jupiter.params.ParameterizedTest
import org.junit.jupiter.params.provider.ValueSource
import org.mockito.Mockito.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*

@WebMvcTest(CourseController::class)
class CourseSearchControllerTests {
    @Autowired lateinit var mvc: MockMvc
    @MockitoBean lateinit var service: CourseService

    @Test
    fun `nearby filter and distance to start are exposed through list API`() {
        val search = CourseSearch(37.528, 126.934, 2000, 5000)
        val item = CourseSummary(1, "테스트", 4800, CourseType.LOOP, StartLocation(37.529, 126.934), 111.0)
        `when`(service.list(0, 20, search)).thenReturn(CourseListResponse(listOf(item), 0, 20, 1, 1))
        mvc.perform(get("/api/courses?latitude=37.528&longitude=126.934&radiusMeters=2000&targetDistanceMeters=5000"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].distanceMeters").value(4800))
            .andExpect(jsonPath("$.content[0].distanceToStartMeters").value(111.0))
        verify(service).list(0, 20, search)
    }

    @Test
    fun `target distance works without location`() {
        val search = CourseSearch(targetDistanceMeters = 5000)
        `when`(service.list(0, 20, search)).thenReturn(CourseListResponse(emptyList(), 0, 20, 0, 0))
        mvc.perform(get("/api/courses?targetDistanceMeters=5000")).andExpect(status().isOk)
        verify(service).list(0, 20, search)
    }

    @ParameterizedTest
    @ValueSource(strings = [
        "latitude=37.5", "longitude=126.9", "radiusMeters=2000",
        "latitude=90.1&longitude=0", "latitude=-90.1&longitude=0",
        "latitude=0&longitude=180.1", "latitude=0&longitude=-180.1",
        "latitude=NaN&longitude=0", "latitude=Infinity&longitude=0", "latitude=0&longitude=-Infinity",
        "latitude=0&longitude=0&radiusMeters=0", "latitude=0&longitude=0&radiusMeters=-1",
        "latitude=0&longitude=0&radiusMeters=50001", "latitude=0&longitude=0&radiusMeters=1.5",
        "targetDistanceMeters=0", "targetDistanceMeters=-1", "targetDistanceMeters=100001",
        "targetDistanceMeters=abc", "targetDistanceMeters=2147483648", "latitude=abc&longitude=0",
    ])
    fun `invalid search is rejected before service`(query: String) {
        mvc.perform(get("/api/courses?$query")).andExpect(status().isBadRequest)
        verifyNoInteractions(service)
    }

    @Test
    fun `incomplete location has a useful problem response`() {
        mvc.perform(get("/api/courses?latitude=37.5"))
            .andExpect(status().isBadRequest)
            .andExpect(content().contentTypeCompatibleWith("application/problem+json"))
            .andExpect(jsonPath("$.detail").value("위도와 경도를 함께 입력해 주세요."))
    }
}
