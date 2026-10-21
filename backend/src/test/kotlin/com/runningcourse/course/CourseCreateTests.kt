package com.runningcourse.course

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.springframework.web.server.ResponseStatusException
import org.mockito.Mockito.*
import com.runningcourse.auth.AuthService
import org.springframework.http.HttpStatus

class CourseCreateTests {
    private val points = listOf(listOf(126.934, 37.528), listOf(126.935, 37.528), listOf(126.935, 37.529), listOf(126.934, 37.528))
    private fun request(coordinates: List<List<Double>> = points) = CreateCourseRequest("실제 코스", "설명", CourseType.LOOP, RouteGeometry("LineString", coordinates))

    @Test fun `closed valid route is accepted`() { assertDoesNotThrow { request().validate() } }
    @Test fun `valid editable waypoints are accepted independently of route geometry`() {
        val waypoints = RouteGeometry("LineString", listOf(
            listOf(126.934, 37.528), listOf(126.935, 37.528),
            listOf(126.935, 37.529), listOf(126.934, 37.528),
        ))
        assertDoesNotThrow { request().copy(routeWaypoints = waypoints).validate() }
    }
    @Test fun `open editable waypoints are rejected`() {
        val openWaypoints = RouteGeometry("LineString", points.dropLast(1) + listOf(listOf(126.936, 37.529)))
        assertThrows(ResponseStatusException::class.java) { request().copy(routeWaypoints = openWaypoints).validate() }
    }
    @Test fun `open route is rejected`() { assertThrows(ResponseStatusException::class.java) { request(points.dropLast(1) + listOf(listOf(126.936, 37.529))).validate() } }
    @Test fun `invalid coordinate dimensions ranges and nonfinite numbers are rejected`() {
        for (point in listOf(listOf(181.0, 37.0), listOf(126.0, Double.NaN), listOf(126.0), listOf(126.0, 37.0, 1.0))) {
            assertThrows(ResponseStatusException::class.java) { request(listOf(point) + points).validate() }
        }
    }
    @Test fun `blank name and oversized geometry are rejected`() {
        assertThrows(ResponseStatusException::class.java) { request().copy(name = " ").validate() }
        assertThrows(ResponseStatusException::class.java) { request(List(10001) { points[0] }).validate() }
    }
    @Test fun `unauthenticated request never calls create service`() {
        val service = mock(CourseCreateService::class.java)
        val auth = mock(AuthService::class.java)
        `when`(auth.requireUser(null)).thenThrow(ResponseStatusException(HttpStatus.UNAUTHORIZED))
        val error = assertThrows(ResponseStatusException::class.java) { CourseCreateController(service, auth).create(null, request()) }
        assertEquals(401, error.statusCode.value())
        verifyNoInteractions(service)
    }
}
