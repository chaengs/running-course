package com.runningcourse.course

enum class ElevationDifficultyLevel { LOW, MEDIUM, HIGH }

data class ElevationDifficulty(
    val level: ElevationDifficultyLevel,
    val ascentMetersPerKm: Double,
    val policyVersion: String = "ascent-density-10-30-v1",
)

object ElevationDifficultyPolicy {
    // Product thresholds, not UTMB/ITRA grades or validated physiological predictions.
    fun assess(distanceMeters: Double, ascentMeters: Double): ElevationDifficulty {
        require(distanceMeters.isFinite() && distanceMeters > 0)
        require(ascentMeters.isFinite() && ascentMeters >= 0)
        val ascentPerKm = ascentMeters / (distanceMeters / 1000)
        val level = when {
            ascentPerKm < 10 -> ElevationDifficultyLevel.LOW
            ascentPerKm < 30 -> ElevationDifficultyLevel.MEDIUM
            else -> ElevationDifficultyLevel.HIGH
        }
        return ElevationDifficulty(level, ascentPerKm)
    }
}
