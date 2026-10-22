package com.runningcourse.course

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Component
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.json.JsonMapper
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.time.Duration
import java.time.LocalDate
import java.time.ZoneOffset
import java.util.concurrent.locks.ReentrantLock

@Component
class OpenTopoDataClient(
    private val mapper: JsonMapper,
    @Value("\${elevation.api-url:https://api.opentopodata.org/v1/srtm30m}") private val apiUrl: String,
) {
    private val http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()
    private val lock = ReentrantLock()
    private var nextRequestAt = 0L
    private var day = LocalDate.now(ZoneOffset.UTC)
    private var requests = 0

    fun lookup(locations: List<ElevationLocation>): List<Double> {
        if (!lock.tryLock()) throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "다른 고도를 계산 중입니다. 잠시 후 다시 시도해 주세요.")
        try {
            val today = LocalDate.now(ZoneOffset.UTC)
            if (today != day) { day = today; requests = 0 }
            val unique = locations.distinct()
            val batches = unique.chunked(100)
            if (requests + batches.size > 900) throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "오늘의 고도 조회 한도를 초과했습니다.")
            val result = mutableMapOf<ElevationLocation, Double>()
            for (batch in batches) {
                val wait = nextRequestAt - System.nanoTime()
                if (wait > 0) java.util.concurrent.TimeUnit.NANOSECONDS.sleep(wait)
                nextRequestAt = System.nanoTime() + 1_100_000_000L
                requests++
                val body = mapper.writeValueAsString(mapOf("locations" to batch.joinToString("|") { "${it.latitude},${it.longitude}" }, "interpolation" to "bilinear"))
                val request = HttpRequest.newBuilder(URI.create(apiUrl)).timeout(Duration.ofSeconds(6))
                    .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body)).build()
                val response = http.send(request, HttpResponse.BodyHandlers.ofString())
                if (response.statusCode() == 429) throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "고도 서비스 요청이 많습니다. 잠시 후 다시 시도해 주세요.")
                if (response.statusCode() != 200) throw IllegalStateException("Elevation upstream failed")
                val json = mapper.readTree(response.body())
                val rows = json.path("results")
                if (json.path("status").asString() != "OK" || !rows.isArray || rows.size() != batch.size) throw IllegalStateException("Invalid elevation response")
                batch.forEachIndexed { index, location ->
                    val value = rows[index].path("elevation")
                    if (!value.isNumber || !value.asDouble().isFinite()) throw ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "경로 일부의 고도 데이터가 없습니다. 다른 경로로 시도해 주세요.")
                    result[location] = value.asDouble()
                }
            }
            return locations.map { result.getValue(it) }
        } catch (error: ResponseStatusException) { throw error }
        catch (error: InterruptedException) { Thread.currentThread().interrupt(); throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "고도 계산이 중단되었습니다.") }
        catch (error: Exception) { throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "고도 서비스에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.") }
        finally { lock.unlock() }
    }
}
