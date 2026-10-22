package com.runningcourse.course

import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper
import java.net.InetSocketAddress
import java.util.concurrent.atomic.AtomicReference
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import org.springframework.web.server.ResponseStatusException

class KakaoAddressSearchServiceTests {
    private val mapper = JsonMapper.builder().build()

    @Test
    fun `search returns WGS84 coordinates and sends REST key`() {
        val receivedAuthorization = AtomicReference<String>()
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/search") { exchange ->
            receivedAuthorization.set(exchange.requestHeaders.getFirst("Authorization"))
            val response = """{"documents":[
                {"address_name":"서울 마포구 월드컵로 1","x":"126.8982","y":"37.5683","road_address":{"address_name":"서울 마포구 월드컵로 1"}},
                {"address_name":"잘못된 좌표","x":"invalid","y":"37.5","road_address":null}
            ]}""".trimIndent().toByteArray()
            exchange.sendResponseHeaders(200, response.size.toLong())
            exchange.responseBody.use { it.write(response) }
        }
        server.start()
        try {
            val service = KakaoAddressSearchService(
                mapper,
                "http://127.0.0.1:${server.address.port}/search",
                "http://127.0.0.1:${server.address.port}/keyword",
                "test-rest-key",
            )
            val results = service.search("서울 마포구")
            assertEquals("KakaoAK test-rest-key", receivedAuthorization.get())
            assertEquals(1, results.size)
            assertEquals(37.5683, results.single().latitude)
            assertEquals(126.8982, results.single().longitude)
            assertEquals("서울 마포구 월드컵로 1", results.single().roadAddressName)
        } finally {
            server.stop(0)
        }
    }

    @Test
    fun `search refuses to call Kakao without REST key`() {
        val service = KakaoAddressSearchService(mapper, "http://127.0.0.1:1/search", "http://127.0.0.1:1/keyword", " ")
        val error = assertFailsWith<ResponseStatusException> { service.search("서울 마포구") }
        assertEquals(503, error.statusCode.value())
    }

    @Test
    fun `Kakao quota error is reported as too many requests`() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/search") { exchange ->
            val response = """{"code":-10,"msg":"API limit has been exceeded."}""".toByteArray()
            exchange.sendResponseHeaders(400, response.size.toLong())
            exchange.responseBody.use { it.write(response) }
        }
        server.start()
        try {
            val service = KakaoAddressSearchService(
                mapper,
                "http://127.0.0.1:${server.address.port}/search",
                "http://127.0.0.1:${server.address.port}/search",
                "test-rest-key",
            )
            val error = assertFailsWith<ResponseStatusException> { service.search("서울 마포구") }
            assertEquals(429, error.statusCode.value())
        } finally {
            server.stop(0)
        }
    }

    @Test
    fun `search falls back to keyword results when no address matches`() {
        val addressCalls = AtomicReference(0)
        val keywordCalls = AtomicReference(0)
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/address") { exchange ->
            addressCalls.set(addressCalls.get() + 1)
            val response = """{"documents":[]}""".toByteArray()
            exchange.sendResponseHeaders(200, response.size.toLong())
            exchange.responseBody.use { it.write(response) }
        }
        server.createContext("/keyword") { exchange ->
            keywordCalls.set(keywordCalls.get() + 1)
            val response = """{"documents":[
                {"place_name":"강남역","address_name":"서울 강남구 역삼동 858","road_address_name":"서울 강남구 강남대로 396","x":"127.0276","y":"37.4979"}
            ]}""".toByteArray()
            exchange.sendResponseHeaders(200, response.size.toLong())
            exchange.responseBody.use { it.write(response) }
        }
        server.start()
        try {
            val service = KakaoAddressSearchService(
                mapper,
                "http://127.0.0.1:${server.address.port}/address",
                "http://127.0.0.1:${server.address.port}/keyword",
                "test-rest-key",
            )

            val result = service.search("강남역").single()

            assertEquals(1, addressCalls.get())
            assertEquals(1, keywordCalls.get())
            assertEquals("강남역", result.placeName)
            assertEquals("서울 강남구 역삼동 858", result.addressName)
            assertEquals("서울 강남구 강남대로 396", result.roadAddressName)
            assertEquals(37.4979, result.latitude)
            assertEquals(127.0276, result.longitude)
        } finally {
            server.stop(0)
        }
    }
}
