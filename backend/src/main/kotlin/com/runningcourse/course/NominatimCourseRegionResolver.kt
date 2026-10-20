package com.runningcourse.course

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import tools.jackson.databind.json.JsonMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets.UTF_8
import java.time.Duration
import java.time.OffsetDateTime
import java.time.ZoneOffset
import java.util.concurrent.TimeUnit
import kotlin.math.roundToLong

@Component
class NominatimCourseRegionResolver(
    private val mapper: JsonMapper,
    @Value("\${geocoding.nominatim.reverse-url:https://nominatim.openstreetmap.org/reverse}") private val reverseUrl: String,
    @Value("\${geocoding.nominatim.user-agent:RunningCourse/0.1.0 (https://github.com/chaengs/running-course)}") private val userAgent: String,
) : CourseRegionResolver {
    private data class CoordinateKey(val latitude: Long, val longitude: Long)

    private val logger = LoggerFactory.getLogger(javaClass)
    private val http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()
    private val cache = object : LinkedHashMap<CoordinateKey, CourseRegion?>(128, 0.75f, true) {
        override fun removeEldestEntry(eldest: MutableMap.MutableEntry<CoordinateKey, CourseRegion?>?) = size > 10_000
    }
    private var nextRequestAtNanos = 0L

    override fun resolve(latitude: Double, longitude: Double): CourseRegion? {
        // The service currently stores Korean administrative regions only.
        if (latitude !in 33.0..39.7 || longitude !in 124.0..132.0) return null
        val key = CoordinateKey((latitude * 1_000_000).roundToLong(), (longitude * 1_000_000).roundToLong())

        synchronized(cache) {
            if (cache.containsKey(key)) return cache[key]
            try {
                val waitNanos = nextRequestAtNanos - System.nanoTime()
                if (waitNanos > 0) TimeUnit.NANOSECONDS.sleep(waitNanos)
                nextRequestAtNanos = System.nanoTime() + REQUEST_INTERVAL_NANOS
                val region = request(key)
                cache[key] = region
                return region
            } catch (error: InterruptedException) {
                Thread.currentThread().interrupt()
                logger.warn("Nominatim lookup was interrupted")
                return null
            } catch (error: Exception) {
                logger.warn("Nominatim lookup failed: {}", error.javaClass.simpleName)
                cache[key] = null
                return null
            }
        }
    }

    private fun request(key: CoordinateKey): CourseRegion? {
        val latitude = key.latitude / 1_000_000.0
        val longitude = key.longitude / 1_000_000.0
        val query = "lat=$latitude&lon=$longitude&format=jsonv2&addressdetails=1&zoom=18&layer=address"
        val request = HttpRequest.newBuilder(URI.create("$reverseUrl?$query"))
            .timeout(Duration.ofSeconds(6))
            .header("User-Agent", userAgent)
            .header("Accept-Language", "ko")
            .header("Accept", "application/json")
            .GET()
            .build()
        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        if (response.statusCode() != 200) return null

        val address = mapper.readTree(response.body()).path("address")
        fun first(vararg keys: String): String? = keys.asSequence()
            .map { address.path(it).asString().trim() }
            .firstOrNull { it.isNotEmpty() }

        val sido = first("state", "province", "region")
        val sigungu = first("state_district", "county", "city_district", "borough", "municipality", "district", "city")
        val eupMyeonDong = first("neighbourhood", "quarter", "suburb", "city_block", "village", "town", "hamlet")
        if (sido == null && sigungu == null && eupMyeonDong == null) return null
        return CourseRegion(
            sido = sido,
            sigungu = sigungu,
            eupMyeonDong = eupMyeonDong,
            source = "OpenStreetMap Nominatim",
            resolvedAt = OffsetDateTime.now(ZoneOffset.UTC),
        )
    }

    private companion object {
        const val REQUEST_INTERVAL_NANOS = 1_100_000_000L
    }
}
