package com.runningcourse.course

import org.slf4j.LoggerFactory
import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestHeader
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException
import com.runningcourse.auth.AuthService
import tools.jackson.databind.json.JsonMapper
import java.net.URI
import java.net.URLEncoder
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import java.nio.charset.StandardCharsets.UTF_8
import java.time.Duration

data class AddressSearchResult(
    val addressName: String,
    val roadAddressName: String?,
    val latitude: Double,
    val longitude: Double,
    val placeName: String? = null,
)

data class AddressSearchResponse(val results: List<AddressSearchResult>)

@Service
class KakaoAddressSearchService(
    private val mapper: JsonMapper,
    @Value("\${geocoding.kakao.address-url:https://dapi.kakao.com/v2/local/search/address.json}") private val addressUrl: String,
    @Value("\${geocoding.kakao.keyword-url:https://dapi.kakao.com/v2/local/search/keyword.json}") private val keywordUrl: String,
    @Value("\${geocoding.kakao.rest-api-key:}") private val restApiKey: String,
) {
    private val logger = LoggerFactory.getLogger(javaClass)
    private val http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5)).build()

    fun search(query: String): List<AddressSearchResult> {
        if (restApiKey.isBlank()) {
            throw ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "주소 검색이 설정되지 않았습니다.")
        }

        val addresses = request(addressUrl, query, keywordSearch = false)
        return addresses.ifEmpty { request(keywordUrl, query, keywordSearch = true) }
    }

    private fun request(endpoint: String, query: String, keywordSearch: Boolean): List<AddressSearchResult> {
        val encodedQuery = URLEncoder.encode(query, UTF_8)
        val request = HttpRequest.newBuilder(URI.create("$endpoint?query=$encodedQuery&size=10"))
            .timeout(Duration.ofSeconds(6))
            .header("Authorization", "KakaoAK $restApiKey")
            .header("Accept", "application/json")
            .GET()
            .build()

        try {
            val response = http.send(request, HttpResponse.BodyHandlers.ofString())
            val upstreamError = if (response.statusCode() == 200) null else {
                runCatching { mapper.readTree(response.body()) }.getOrNull()
            }
            val upstreamCode = upstreamError?.path("code")?.asString()
            if (response.statusCode() == 429 || upstreamCode == "-10") {
                throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "주소 검색 요청이 많습니다. 잠시 후 다시 시도해 주세요.")
            }
            if (response.statusCode() != 200) {
                logger.warn(
                    "Kakao address search failed: status={}, code={}, message={}",
                    response.statusCode(),
                    upstreamCode ?: "unknown",
                    upstreamError?.path("msg")?.asString() ?: "unknown",
                )
                throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "주소 검색 서비스에 연결하지 못했습니다.")
            }

            return mapper.readTree(response.body()).path("documents").take(10).mapNotNull { document ->
                val addressName = document.path("address_name").asString().trim()
                val latitude = document.path("y").asString().toDoubleOrNull()
                val longitude = document.path("x").asString().toDoubleOrNull()
                if (addressName.isEmpty() || latitude == null || longitude == null ||
                    latitude !in -90.0..90.0 || longitude !in -180.0..180.0
                ) return@mapNotNull null

                val roadAddress = if (keywordSearch) {
                    document.path("road_address_name").asString().trim()
                } else {
                    document.path("road_address").path("address_name").asString().trim()
                }
                AddressSearchResult(
                    addressName = addressName,
                    roadAddressName = roadAddress.takeIf(String::isNotEmpty),
                    latitude = requireNotNull(latitude),
                    longitude = requireNotNull(longitude),
                    placeName = if (keywordSearch) document.path("place_name").asString().trim().takeIf(String::isNotEmpty) else null,
                )
            }
        } catch (error: ResponseStatusException) {
            throw error
        } catch (error: InterruptedException) {
            Thread.currentThread().interrupt()
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "주소 검색이 중단됐습니다.")
        } catch (error: Exception) {
            logger.warn("Kakao address search failed: {}", error.javaClass.simpleName)
            throw ResponseStatusException(HttpStatus.BAD_GATEWAY, "주소 검색 서비스에 연결하지 못했습니다.")
        }
    }
}

@RestController
@RequestMapping("/api/my/addresses")
class KakaoAddressSearchController(
    private val auth: AuthService,
    private val service: KakaoAddressSearchService,
) {
    @GetMapping("/search")
    fun search(
        @RequestHeader("Authorization", required = false) authorization: String?,
        @RequestParam query: String,
    ): AddressSearchResponse {
        auth.requireUser(authorization)
        val normalized = query.trim()
        if (normalized.length !in 2..100) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "주소는 2자 이상 100자 이하로 입력해 주세요.")
        }
        return AddressSearchResponse(service.search(normalized))
    }
}
