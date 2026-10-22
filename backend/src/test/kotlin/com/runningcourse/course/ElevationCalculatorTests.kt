package com.runningcourse.course

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.springframework.web.server.ResponseStatusException

class ElevationCalculatorTests {
    private fun route(vararg points: List<Double>) = RouteGeometry("LineString", points.toList())

    @Test fun `sampling fills segment interiors preserves endpoints and distance ordering`() {
        val input = route(listOf(126.0,37.0), listOf(126.01,37.0), listOf(126.01,37.01))
        val sampled = ElevationCalculator.sample(input)
        assertEquals(ElevationLocation(37.0,126.0), sampled.locations.first())
        assertEquals(ElevationLocation(37.01,126.01), sampled.locations.last())
        assertTrue(sampled.locations.size > 30)
        assertTrue(sampled.intervalMeters <= 50)
        assertTrue(sampled.distances.zipWithNext().all { (a,b) -> b > a })
        assertTrue(sampled.locations.any { it.longitude > 126.0 && it.longitude < 126.01 })
    }

    @Test fun `closed path reuses identical start and finish and handles repeated points`() {
        val start = listOf(126.0,37.0)
        val sampled = ElevationCalculator.sample(route(start,start,listOf(126.01,37.0),listOf(126.01,37.01),start,start))
        assertEquals(sampled.locations.first(), sampled.locations.last())
        assertTrue(sampled.locations.all { it.latitude.isFinite() && it.longitude.isFinite() })
    }

    @Test fun `long routes have bounded point count and dateline interpolation stays near dateline`() {
        val sampled = ElevationCalculator.sample(route(listOf(179.8,0.0),listOf(-179.8,0.0)))
        assertEquals(500, sampled.locations.size)
        assertTrue(sampled.locations.all { kotlin.math.abs(it.longitude) >= 179.8 - .0001 })
        assertTrue(sampled.intervalMeters > 50)
    }

    @Test fun `invalid routes fail before lookup`() {
        for (input in listOf(route(listOf(126.0,37.0)), route(listOf(126.0,37.0),listOf(126.0,37.0)),
            route(listOf(Double.NaN,37.0),listOf(126.0,37.0)), route(listOf(181.0,37.0),listOf(126.0,37.0)),
            route(listOf(126.0,37.0),listOf(130.0,40.0)))) {
            assertThrows(ResponseStatusException::class.java) { ElevationCalculator.sample(input) }
        }
    }

    @Test fun `median removes isolated spike and loop boundary remains equal`() {
        assertEquals(listOf(10.0,10.0,10.0,10.0,10.0), ElevationCalculator.smooth(listOf(10.0,10.0,90.0,10.0,10.0), false))
        val values = ElevationCalculator.smooth(listOf(10.0,11.0,12.0,10.0), true)
        assertEquals(values.first(), values.last())
    }

    @Test fun `threshold suppresses small oscillations but counts gradual uphill and confirmed reversals`() {
        assertEquals(0.0 to 0.0, ElevationCalculator.gainLoss(listOf(100.0,101.0,100.0,101.0,100.0)))
        assertEquals(10.0 to 0.0, ElevationCalculator.gainLoss((100..110).map { it.toDouble() }))
        assertEquals(0.0 to 10.0, ElevationCalculator.gainLoss((110 downTo 100).map { it.toDouble() }))
        assertEquals(20.0 to 20.0, ElevationCalculator.gainLoss(listOf(100.0,110.0,109.0,120.0,110.0,100.0)))
        assertEquals(10.0 to 10.0, ElevationCalculator.gainLoss(listOf(100.0,90.0,100.0)))
    }
}
