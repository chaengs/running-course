package com.runningcourse.course

import com.runningcourse.auth.AuthService
import org.springframework.stereotype.Service
import org.springframework.web.bind.annotation.*
import java.time.Instant

data class ElevationRequest(val routeGeojson: RouteGeometry)
data class ElevationProfile(
    val samples: List<ElevationSample>, val minElevationMeters: Double, val maxElevationMeters: Double,
    val ascentMeters: Double, val descentMeters: Double, val distanceMeters: Double,
    val sampleIntervalMeters: Double, val dataset: String = "srtm30m", val calculatedAt: Instant = Instant.now(),
    val algorithmVersion: String = "median3-hysteresis5-v1",
    val difficulty: ElevationDifficulty,
)

@Service
class ElevationService(private val client: OpenTopoDataClient) {
    fun calculate(route: RouteGeometry): ElevationProfile {
        val sampled = ElevationCalculator.sample(route)
        val raw = client.lookup(sampled.locations)
        val smoothed = ElevationCalculator.smooth(raw, route.coordinates.first() == route.coordinates.last())
        val (gain, loss) = ElevationCalculator.gainLoss(smoothed)
        return ElevationProfile(sampled.distances.indices.map { ElevationSample(sampled.distances[it], smoothed[it], raw[it]) },
            smoothed.min(), smoothed.max(), gain, loss, sampled.distances.last(), sampled.intervalMeters,
            difficulty = ElevationDifficultyPolicy.assess(sampled.distances.last(), gain))
    }
}

@RestController
@RequestMapping("/api/my/elevation")
class ElevationController(private val auth: AuthService, private val service: ElevationService) {
    @PostMapping
    fun calculate(@RequestHeader("Authorization", required = false) authorization: String?, @RequestBody request: ElevationRequest): ElevationProfile {
        auth.requireUser(authorization)
        return service.calculate(request.routeGeojson)
    }
}
