package com.runningcourse.course

import org.junit.jupiter.api.Assertions.assertEquals
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
}
