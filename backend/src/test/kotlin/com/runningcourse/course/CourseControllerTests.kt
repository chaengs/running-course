package com.runningcourse.course

import com.runningcourse.auth.AuthService
import com.runningcourse.auth.UserView
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
    @MockitoBean lateinit var auth: AuthService

    @Test
    fun `feed returns hasNext and passes signed in viewer and filters`() {
        val user = UserView(7, "runner@example.com", "runner")
        val search = CourseSearch(37.528, 126.934, 2000, 5000)
        `when`(auth.current("Bearer token")).thenReturn(user)
        `when`(service.feed(0, 2, search, 7)).thenReturn(CourseFeedResponse(emptyList(), 0, 2, false))
        mvc.perform(get("/api/courses/feed").param("size", "2")
            .param("latitude", "37.528").param("longitude", "126.934")
            .param("radiusMeters", "2000").param("targetDistanceMeters", "5000")
            .header("Authorization", "Bearer token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.hasNext").value(false))
            .andExpect(jsonPath("$.totalElements").doesNotExist())
        verify(service).feed(0, 2, search, 7)
    }

    @ParameterizedTest
    @ValueSource(strings = ["page=-1", "size=0", "size=101", "page=2147483648"])
    fun `feed rejects invalid pagination`(query: String) {
        mvc.perform(get("/api/courses/feed?$query")).andExpect(status().isBadRequest)
    }

    @Test
    fun `preview passes viewer and returns only geometry`() {
        val route = tools.jackson.databind.json.JsonMapper.builder().build()
            .readTree("""{"type":"LineString","coordinates":[[126.934,37.528],[126.935,37.529]]}""")
        `when`(auth.current("Bearer token")).thenReturn(UserView(7, "runner@example.com", "runner"))
        `when`(service.preview(1, 7)).thenReturn(route)
        mvc.perform(get("/api/courses/1/preview").header("Authorization", "Bearer token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.type").value("LineString"))
            .andExpect(jsonPath("$.description").doesNotExist())
        verify(service).preview(1, 7)
    }

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

    @Test
    fun `list includes bookmark state for the signed in viewer`() {
        val user = UserView(7, "runner@example.com", "runner")
        val item = CourseSummary(
            1, "찜한 코스", 4800, CourseType.LOOP, StartLocation(37.528, 126.934),
            elevationDifficulty = ElevationDifficultyLevel.LOW,
            isBookmarked = true,
        )
        `when`(auth.current("Bearer token")).thenReturn(user)
        `when`(service.list(0, 20, CourseSearch(), user.id))
            .thenReturn(CourseListResponse(listOf(item), 0, 20, 1, 1))

        mvc.perform(get("/api/courses").header("Authorization", "Bearer token"))
            .andExpect(status().isOk)
            .andExpect(jsonPath("$.content[0].isBookmarked").value(true))
            .andExpect(jsonPath("$.content[0].elevationDifficulty").value("LOW"))
    }

    @ParameterizedTest
    @ValueSource(strings = ["page=-1", "size=0", "size=-1", "size=101", "page=abc", "size=abc", "page=2147483648"])
    fun `invalid pagination returns bad request`(query: String) {
        mvc.perform(get("/api/courses?$query")).andExpect(status().isBadRequest)
    }
}
