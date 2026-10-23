package com.runningcourse.course

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import tools.jackson.databind.json.JsonMapper
import org.junit.jupiter.api.Test
import org.mockito.Mockito.*

class CourseServiceTests {
    private val repository = mock(CourseRepository::class.java)
    private val service = CourseService(repository)

    @Test
    fun `partial final page is included in total pages`() {
        `when`(repository.countPublished()).thenReturn(5)
        `when`(repository.findPublished(2, 4)).thenReturn(emptyList())
        val result = service.list(2, 2)
        assertEquals(3L, result.totalPages)
        assertEquals(5L, result.totalElements)
        verify(repository).findPublished(2, 4)
    }

    @Test
    fun `empty collection has zero pages`() {
        `when`(repository.countPublished()).thenReturn(0)
        `when`(repository.findPublished(20, 0)).thenReturn(emptyList())
        val result = service.list(0, 20)
        assertEquals(0L, result.totalPages)
        assertEquals(emptyList<CourseSummary>(), result.content)
    }

    @Test
    fun `large page does not overflow offset`() {
        `when`(repository.countPublished()).thenReturn(4)
        `when`(repository.findPublished(100, 214748364700L)).thenReturn(emptyList())
        assertEquals(1L, service.list(Int.MAX_VALUE, 100).totalPages)
        verify(repository).findPublished(100, 214748364700L)
    }

    @Test
    fun `detail returns published course including its route`() {
        val route = JsonMapper.builder().build().readTree(
            """{"type":"LineString","coordinates":[[126.934,37.528],[126.935,37.529],[126.934,37.528]]}""",
        )
        val detail = CourseDetail(1, "테스트 코스", "설명", 4800, CourseType.LOOP, StartLocation(37.528, 126.934), route)
        `when`(repository.findVisibleById(1, null)).thenReturn(detail)
        assertEquals(detail, service.detail(1))
    }

    @Test
    fun `unavailable detail raises not found instead of returning null`() {
        `when`(repository.findVisibleById(99, null)).thenReturn(null)
        assertThrows(CourseNotFoundException::class.java) { service.detail(99) }
    }

    @Test
    fun `record view delegates to public-only repository update`() {
        `when`(repository.recordPublishedView(1)).thenReturn(true)
        service.recordView(1)
        verify(repository).recordPublishedView(1)
    }

    @Test
    fun `record view hides private and nonexistent courses`() {
        `when`(repository.recordPublishedView(99)).thenReturn(false)
        assertThrows(CourseNotFoundException::class.java) { service.recordView(99) }
    }

    @Test
    fun `count and paginated list use the same search conditions`() {
        val search = CourseSearch(37.528, 126.934, 2000, 5000)
        `when`(repository.countPublished(search)).thenReturn(3)
        `when`(repository.findPublished(2, 2, search)).thenReturn(emptyList())
        val result = service.list(1, 2, search)
        assertEquals(3L, result.totalElements)
        assertEquals(2L, result.totalPages)
        verify(repository).countPublished(search)
        verify(repository).findPublished(2, 2, search)
    }
}
