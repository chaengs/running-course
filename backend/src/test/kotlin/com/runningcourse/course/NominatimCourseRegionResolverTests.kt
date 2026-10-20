package com.runningcourse.course

import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Assertions.assertNotNull
import org.junit.jupiter.api.Test
import tools.jackson.databind.json.JsonMapper
import java.net.InetSocketAddress

class NominatimCourseRegionResolverTests {
    private val mapper = JsonMapper.builder().build()

    @Test
    fun `reverse geocoding maps Korean administrative levels and caches coordinate`() {
        var requests = 0
        var userAgent = ""
        var acceptLanguage = ""
        var query = ""
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/reverse") { exchange ->
            requests++
            userAgent = exchange.requestHeaders.getFirst("User-Agent") ?: ""
            acceptLanguage = exchange.requestHeaders.getFirst("Accept-Language") ?: ""
            query = exchange.requestURI.rawQuery
            val bytes = """{"address":{"state":"서울특별시","city_district":"마포구","neighbourhood":"공덕동"}}""".toByteArray()
            exchange.sendResponseHeaders(200, bytes.size.toLong())
            exchange.responseBody.use { it.write(bytes) }
        }
        server.start()
        try {
            val resolver = NominatimCourseRegionResolver(mapper, "http://127.0.0.1:${server.address.port}/reverse", "RunningCourseTest/1.0")
            val result = resolver.resolve(37.544, 126.951)
            assertEquals("서울특별시", result?.sido)
            assertEquals("마포구", result?.sigungu)
            assertEquals("공덕동", result?.eupMyeonDong)
            assertEquals("OpenStreetMap Nominatim", result?.source)
            assertNotNull(result?.resolvedAt)
            assertEquals(result, resolver.resolve(37.544, 126.951))
            assertEquals(1, requests)
            assertEquals("RunningCourseTest/1.0", userAgent)
            assertEquals("ko", acceptLanguage)
            assert(query.contains("format=jsonv2"))
            assert(query.contains("addressdetails=1"))
        } finally {
            server.stop(0)
        }
    }

    @Test
    fun `coordinates outside South Korea do not call Nominatim`() {
        var requests = 0
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/reverse") { exchange ->
            requests++
            exchange.sendResponseHeaders(500, -1)
            exchange.close()
        }
        server.start()
        try {
            val resolver = NominatimCourseRegionResolver(mapper, "http://127.0.0.1:${server.address.port}/reverse", "RunningCourseTest/1.0")
            assertNull(resolver.resolve(40.0, 126.0))
            assertEquals(0, requests)
        } finally {
            server.stop(0)
        }
    }
}
