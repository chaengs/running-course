package com.runningcourse.course

import org.junit.jupiter.api.Assertions.*
import org.junit.jupiter.api.Test

class CourseSearchTests {
    @Test
    fun `location gets default radius while unfiltered search has no center or radius`() {
        val search = CourseSearch(latitude = 37.528, longitude = 126.934)
        assertEquals(StartLocation(37.528, 126.934), search.center)
        assertEquals(2000, search.effectiveRadiusMeters)
        assertNull(CourseSearch().center)
        assertNull(CourseSearch().effectiveRadiusMeters)
    }

    @Test
    fun `distance choices map to disjoint inclusive meter ranges`() {
        for ((target, min, max) in listOf(Triple(3000, 1, 4000), Triple(5000, 4001, 7000), Triple(10000, 7001, 11000))) {
            val search = CourseSearch(targetDistanceMeters = target)
            assertEquals(min, search.minDistanceMeters)
            assertEquals(max, search.maxDistanceMeters)
        }
        assertNull(CourseSearch().minDistanceMeters)
        assertNull(CourseSearch().maxDistanceMeters)
        for (target in listOf(1, 4000, 5001, 11000, 100000)) {
            assertThrows(InvalidCourseSearchException::class.java) { CourseSearch(targetDistanceMeters = target) }
        }
    }

    @Test
    fun `minimum distance filter supports greater than eleven kilometer searches`() {
        val search = CourseSearch(minimumDistanceMeters = 11001)
        assertEquals(11001, search.minimumDistanceMeters)
        assertThrows(InvalidCourseSearchException::class.java) {
            CourseSearch(targetDistanceMeters = 10000, minimumDistanceMeters = 11001)
        }
    }

    @Test
    fun `non finite coordinates are rejected`() {
        for (invalid in listOf(Double.NaN, Double.POSITIVE_INFINITY, Double.NEGATIVE_INFINITY)) {
            assertThrows(InvalidCourseSearchException::class.java) { CourseSearch(invalid, 0.0) }
            assertThrows(InvalidCourseSearchException::class.java) { CourseSearch(0.0, invalid) }
        }
    }

    @Test
    fun `valid coordinate radius and target limits are inclusive`() {
        CourseSearch(-90.0, -180.0, 1, 3000)
        CourseSearch(90.0, 180.0, 50000, 10000)
    }
}
