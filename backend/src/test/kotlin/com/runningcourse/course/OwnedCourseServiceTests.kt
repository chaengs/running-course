package com.runningcourse.course

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.mockito.Mockito.*
import org.springframework.web.server.ResponseStatusException

class OwnedCourseServiceTests {
    private val repository = mock(OwnedCourseRepository::class.java)
    private val service = OwnedCourseService(repository)
    private val request = CreateCourseRequest("코스", "", CourseType.LOOP, RouteGeometry("LineString", listOf(
        listOf(126.934, 37.528), listOf(126.935, 37.528), listOf(126.935, 37.529), listOf(126.934, 37.528))))

    @Test fun `update checks ownership without loading full course before mutation`() {
        `when`(repository.lockOwned(1, 2)).thenReturn(true)
        `when`(repository.update(1, 2, request)).thenReturn(CreatedCourse(1, 340))
        assertEquals(CreatedCourse(1, 340), service.update(1, 2, request))
        val order = inOrder(repository)
        order.verify(repository).lockOwned(1, 2)
        order.verify(repository).update(1, 2, request)
        verifyNoMoreInteractions(repository)
    }

    @Test fun `missing owner never mutates route`() {
        val error = assertThrows(ResponseStatusException::class.java) { service.update(1, 2, request) }
        assertEquals(404, error.statusCode.value())
        verify(repository).lockOwned(1, 2)
        verifyNoMoreInteractions(repository)
    }

    @Test fun `invalid geometry never reaches update SQL`() {
        `when`(repository.lockOwned(1, 2)).thenReturn(true)
        val error = assertThrows(ResponseStatusException::class.java) { service.update(1, 2, request.copy(name = " ")) }
        assertEquals(400, error.statusCode.value())
        verify(repository).lockOwned(1, 2)
        verifyNoMoreInteractions(repository)
    }
}
