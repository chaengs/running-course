package com.runningcourse.course

import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*

class ElevationDifficultyTests {
    @Test fun `five kilometer examples and exact boundaries use unrounded ascent`() {
        val examples = listOf(
            0.0 to ElevationDifficultyLevel.LOW,
            25.0 to ElevationDifficultyLevel.LOW,
            49.999 to ElevationDifficultyLevel.LOW,
            50.0 to ElevationDifficultyLevel.MEDIUM,
            100.0 to ElevationDifficultyLevel.MEDIUM,
            149.999 to ElevationDifficultyLevel.MEDIUM,
            150.0 to ElevationDifficultyLevel.HIGH,
            200.0 to ElevationDifficultyLevel.HIGH,
        )
        for ((ascent, level) in examples) assertEquals(level, ElevationDifficultyPolicy.assess(5000.0, ascent).level)
    }

    @Test fun `same ascent density gives same terrain difficulty regardless of length`() {
        assertEquals(ElevationDifficultyLevel.MEDIUM, ElevationDifficultyPolicy.assess(1000.0, 20.0).level)
        assertEquals(ElevationDifficultyLevel.MEDIUM, ElevationDifficultyPolicy.assess(10000.0, 200.0).level)
        assertEquals(20.0, ElevationDifficultyPolicy.assess(5000.0, 100.0).ascentMetersPerKm)
        assertEquals(ElevationDifficultyLevel.HIGH, ElevationDifficultyPolicy.assess(1000.0, 100.0).level)
        assertEquals(ElevationDifficultyLevel.LOW, ElevationDifficultyPolicy.assess(42000.0, 0.0).level)
    }

    @Test fun `invalid inputs cannot receive an easy rating`() {
        for (distance in listOf(0.0, -1.0, Double.NaN, Double.POSITIVE_INFINITY))
            assertThrows(IllegalArgumentException::class.java) { ElevationDifficultyPolicy.assess(distance, 0.0) }
        for (gain in listOf(-1.0, Double.NaN, Double.POSITIVE_INFINITY))
            assertThrows(IllegalArgumentException::class.java) { ElevationDifficultyPolicy.assess(5000.0, gain) }
    }
}
