package com.runningcourse.course

import com.runningcourse.auth.AuthService
import com.runningcourse.auth.UserView
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest
import org.springframework.http.HttpStatus
import org.springframework.test.context.bean.override.mockito.MockitoBean
import org.springframework.test.web.servlet.MockMvc
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*
import org.springframework.test.web.servlet.result.MockMvcResultMatchers.*
import org.springframework.web.server.ResponseStatusException

@WebMvcTest(CourseBookmarkController::class)
class CourseBookmarkControllerTests {
    @Autowired lateinit var mvc: MockMvc
    @MockitoBean lateinit var auth: AuthService
    @MockitoBean lateinit var bookmarks: CourseBookmarkService

    @Test fun `all endpoints reject anonymous requests before accessing bookmarks`() {
        `when`(auth.requireUser(null)).thenThrow(ResponseStatusException(HttpStatus.UNAUTHORIZED))
        for (request in listOf(get("/api/my/bookmarks"), get("/api/my/bookmarks/7"), put("/api/my/bookmarks/7"), delete("/api/my/bookmarks/7"))) {
            mvc.perform(request).andExpect(status().isUnauthorized)
        }
        verifyNoInteractions(bookmarks)
    }

    @Test fun `list uses authenticated identity and forwards page`() {
        `when`(auth.requireUser("Bearer test")).thenReturn(UserView(3, "runner@example.com", "러너"))
        `when`(bookmarks.list(3, 1)).thenReturn(BookmarkPage(listOf(BookmarkedCourse(7, "한강 코스", 5000, CourseType.LOOP, null, null)), 1, false))
        mvc.perform(get("/api/my/bookmarks?page=1&userId=99").header("Authorization", "Bearer test"))
            .andExpect(status().isOk).andExpect(jsonPath("$.content[0].id").value(7))
            .andExpect(jsonPath("$.page").value(1)).andExpect(jsonPath("$.hasNext").value(false))
        verify(bookmarks).list(3, 1)
    }

    @Test fun `identity comes from session rather than request body`() {
        `when`(auth.requireUser("Bearer test")).thenReturn(UserView(3, "runner@example.com", "러너"))
        `when`(bookmarks.status(3, 7)).thenReturn(BookmarkStatus(true))
        mvc.perform(get("/api/my/bookmarks/7").header("Authorization", "Bearer test"))
            .andExpect(status().isOk).andExpect(jsonPath("$.bookmarked").value(true))
        mvc.perform(put("/api/my/bookmarks/7").header("Authorization", "Bearer test").contentType("application/json").content("""{"userId":99}"""))
            .andExpect(status().isNoContent)
        mvc.perform(delete("/api/my/bookmarks/7").header("Authorization", "Bearer test"))
            .andExpect(status().isNoContent)
        verify(bookmarks).add(3, 7)
        verify(bookmarks).remove(3, 7)
    }
}
