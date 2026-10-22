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
    fun `tolerance rounds integer boundaries inward and accepts target without location`() {
        val search = CourseSearch(targetDistanceMeters = 5001)
        assertEquals(4501, search.minDistanceMeters)
        assertEquals(5501, search.maxDistanceMeters)
    }

    @Test
    fun `minimum distance filter supports greater than ten kilometer searches`() {
        val search = CourseSearch(minimumDistanceMeters = 10001)
        assertEquals(10001, search.minimumDistanceMeters)
        assertThrows(InvalidCourseSearchException::class.java) {
            CourseSearch(targetDistanceMeters = 10000, minimumDistanceMeters = 10001)
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
        CourseSearch(-90.0, -180.0, 1, 1)
        CourseSearch(90.0, 180.0, 50000, 100000)
    }
}
