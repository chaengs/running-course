package com.runningcourse.course

import com.runningcourse.auth.AuthService
import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.PostMapping
import org.springframework.web.bind.annotation.RequestBody
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.json.JsonMapper
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets.UTF_8
import java.time.Duration

data class WalkingRoutePoint(val latitude: Double, val longitude: Double)
data class KakaoWalkingRouteRequest(val points: List<WalkingRoutePoint>, val routeMode: String = "SHORTEST")
data class KakaoWalkingRouteResponse(
    val status: String,
    val distanceMeters: Int,
    val durationSeconds: Int,
    val points: List<WalkingRoutePoint>,
    val landingUrl: String?,
)

@RestController
@RequestMapping(value = ["/api/test/kakao-walking", "/api/walking-routes/segment"])
class KakaoWalkingRouteController(
    private val auth: AuthService,
    private val mapper: JsonMapper,
    @Value("\${geocoding.kakao.rest-api-key:}") private val restApiKey: String,
    @Value("\${geocoding.kakao.walking-url:https://dapi.kakao.com/v2/routing/walk}") private val walkingUrl: String,
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()

    @PostMapping
    fun route(
        @RequestHeader("Authorization", required = false) authorization: String?,
        @RequestBody request: KakaoWalkingRouteRequest,
    ): KakaoWalkingRouteResponse {
        auth.requireUser(authorization)
        if (restApiKey.isBlank()) throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "카카오 REST API 키가 설정되지 않았습니다.")
        if (request.points.size != 2) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "도보 구간은 시작점과 도착점 두 지점으로 요청해 주세요.")
        if (request.points.any { !it.latitude.isFinite() || it.latitude !in -90.0..90.0 || !it.longitude.isFinite() || it.longitude !in -180.0..180.0 }) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "위도 또는 경도 값이 올바르지 않습니다.")
        }
        val mode = request.routeMode.uppercase()
        if (mode !in setOf("BROAD_FIRST", "SHORTEST", "ACCESSIBLE")) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "지원하지 않는 경로 옵션입니다.")
        }

        val query = linkedMapOf(
            "start_x" to request.points.first().longitude.toString(),
            "start_y" to request.points.first().latitude.toString(),
            "end_x" to request.points.last().longitude.toString(),
            "end_y" to request.points.last().latitude.toString(),
            "route_mode" to mode,
            "input_coord" to "WGS84",
            "output_coord" to "WGS84",
        )
        val vias = request.points.drop(1).dropLast(1)
        if (vias.isNotEmpty()) {
            query["via_x"] = vias.joinToString(",") { it.longitude.toString() }
            query["via_y"] = vias.joinToString(",") { it.latitude.toString() }
        }
        val encoded = query.entries.joinToString("&") { (key, value) ->
            "${URLEncoder.encode(key, UTF_8)}=${URLEncoder.encode(value, UTF_8)}"
        }
        val upstreamRequest = HttpRequest.newBuilder(URI.create("$walkingUrl?$encoded"))
            .timeout(Duration.ofSeconds(15))
            .header("Authorization", "KakaoAK $restApiKey")
            .header("Accept", "application/json")
            .GET().build()
        try {
            val response = http.send(upstreamRequest, HttpResponse.BodyHandlers.ofString())
            if (response.statusCode() != 200) {
                logger.warn("Kakao walking route failed: status={}", response.statusCode())
                throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "카카오 도보 경로를 가져오지 못했습니다. REST API 키와 카카오맵 API 설정을 확인해 주세요.")
            }
            val root = mapper.readTree(response.body())
            val status = root.path("status").asString("UNKNOWN")
            if (status != "OK") throw ResponseStatusException(HttpStatus.UNPROCESSABLE_ENTITY, "도보 경로를 찾지 못했습니다. (카카오 응답: $status)")
            val route = root.path("route")
            val routePoints = buildList {
                route.path("legs").forEach { leg ->
                    leg.path("steps").forEach { step ->
                        step.path("path").path("points").forEach { pair ->
                            if (pair.size() >= 2 && pair[0].isNumber && pair[1].isNumber) {
                                val point = WalkingRoutePoint(pair[1].asDouble(), pair[0].asDouble())
                                if (lastOrNull() != point) add(point)
                            }
                        }
                    }
                }
            }
            if (routePoints.size < 2) throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "카카오 응답에 표시할 경로 좌표가 없습니다.")
            val properties = route.path("properties")
            return KakaoWalkingRouteResponse(
                status = status,
                distanceMeters = properties.path("totalDistance").asInt(),
                durationSeconds = properties.path("totalTime").asInt(),
                points = routePoints,
                landingUrl = properties.path("landingUrl").asString().takeIf(String::isNotBlank),
            )
        } catch (error: ResponseStatusException) {
            throw error
        } catch (error: InterruptedException) {
            Thread.currentThread().interrupt()
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "도보 경로 요청이 중단됐습니다.")
        } catch (error: Exception) {
            logger.warn("Kakao walking route request failed: {}", error.javaClass.simpleName)
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "카카오 도보 경로 서비스에 연결하지 못했습니다.")
        }
    }
}
