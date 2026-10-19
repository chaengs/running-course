package com.runningcourse.course

import kotlin.math.*
import org.springframework.http.HttpStatus
import org.springframework.web.server.ResponseStatusException

data class ElevationLocation(val latitude: Double, val longitude: Double)
data class ElevationSample(val distanceMeters: Double, val elevationMeters: Double, val rawElevationMeters: Double)
data class SampledRoute(val locations: List<ElevationLocation>, val distances: List<Double>, val intervalMeters: Double)

object ElevationCalculator {
    private const val radius = 6371008.8
    fun sample(route: RouteGeometry): SampledRoute {
        if (route.type != "LineString" || route.coordinates.size !in 2..10000 || route.coordinates.any {
            it.size != 2 || !it[0].isFinite() || !it[1].isFinite() || it[0] !in -180.0..180.0 || it[1] !in -90.0..90.0
        }) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "경로 좌표가 올바르지 않습니다.")
        val points = route.coordinates.map { ElevationLocation(it[1], it[0]) }
        val cumulative = mutableListOf(0.0)
        points.zipWithNext().forEach { (a, b) -> cumulative.add(cumulative.last() + distance(a, b)) }
        val length = cumulative.last()
        if (length !in 1.0..100000.0) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "고도 계산 경로는 1m~100km여야 합니다.")
        // At most 500 samples / 5 upstream calls. Longer courses use wider spacing.
        val segments = ceil(length / 50).toInt().coerceIn(1, 499)
        val distances = (0..segments).map { length * it / segments }
        var edge = 0
        val locations = distances.map { d ->
            while (edge < points.size - 2 && cumulative[edge + 1] <= d) edge++
            val segmentLength = cumulative[edge + 1] - cumulative[edge]
            if (segmentLength == 0.0) points[edge + 1]
            else interpolate(points[edge], points[edge + 1], ((d - cumulative[edge]) / segmentLength).coerceIn(0.0, 1.0))
        }.toMutableList()
        locations[0] = points.first()
        locations[locations.lastIndex] = points.last()
        return SampledRoute(locations, distances, length / segments)
    }

    private fun distance(a: ElevationLocation, b: ElevationLocation): Double {
        val lat1 = Math.toRadians(a.latitude); val lat2 = Math.toRadians(b.latitude)
        val h = sin((lat2 - lat1) / 2).pow(2) + cos(lat1) * cos(lat2) * sin(Math.toRadians(b.longitude - a.longitude) / 2).pow(2)
        return 2 * radius * asin(sqrt(h.coerceIn(0.0, 1.0)))
    }

    private fun interpolate(a: ElevationLocation, b: ElevationLocation, fraction: Double): ElevationLocation {
        val lat1 = Math.toRadians(a.latitude); val lat2 = Math.toRadians(b.latitude)
        val deltaLon = Math.toRadians(b.longitude - a.longitude)
        val bearing = atan2(sin(deltaLon) * cos(lat2), cos(lat1) * sin(lat2) - sin(lat1) * cos(lat2) * cos(deltaLon))
        val arc = distance(a, b) * fraction / radius
        val lat = asin((sin(lat1) * cos(arc) + cos(lat1) * sin(arc) * cos(bearing)).coerceIn(-1.0, 1.0))
        val lon = Math.toRadians(a.longitude) + atan2(sin(bearing) * sin(arc) * cos(lat1), cos(arc) - sin(lat1) * sin(lat))
        return ElevationLocation(Math.toDegrees(lat), ((Math.toDegrees(lon) + 540) % 360) - 180)
    }

    fun smooth(values: List<Double>, closed: Boolean): List<Double> = values.indices.map { i ->
        if (closed && values.size >= 4) {
            val last = values.lastIndex
            val at = if (i == last) 0 else i
            listOf(values[(at - 1 + last) % last], values[at], values[(at + 1) % last]).sorted()[1]
        } else if (i == 0 || i == values.lastIndex) values[i]
        else values.subList(i - 1, i + 2).sorted()[1]
    }

    // Confirm reversals only after 5m; small steps in a sustained climb still count.
    fun gainLoss(values: List<Double>, threshold: Double = 5.0): Pair<Double, Double> {
        var anchor = values.first(); var peak = anchor; var trough = anchor
        var direction = 0; var gain = 0.0; var loss = 0.0
        for (value in values.drop(1)) {
            when (direction) {
                0 -> if (value - anchor >= threshold) { direction = 1; peak = value }
                    else if (anchor - value >= threshold) { direction = -1; trough = value }
                1 -> {
                    peak = max(peak, value)
                    if (peak - value >= threshold) { gain += peak - anchor; anchor = peak; trough = value; direction = -1 }
                }
                -1 -> {
                    trough = min(trough, value)
                    if (value - trough >= threshold) { loss += anchor - trough; anchor = trough; peak = value; direction = 1 }
                }
            }
        }
        if (direction == 1) gain += max(0.0, values.last() - anchor)
        if (direction == -1) loss += max(0.0, anchor - values.last())
        return gain to loss
    }
}
