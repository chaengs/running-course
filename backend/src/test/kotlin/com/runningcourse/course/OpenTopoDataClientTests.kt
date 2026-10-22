package com.runningcourse.course

import com.sun.net.httpserver.HttpServer
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.Assertions.*
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.json.JsonMapper
import java.net.InetSocketAddress

class OpenTopoDataClientTests {
    private val mapper = JsonMapper.builder().build()

    @Test fun `lookup batches at 100 deduplicates closed endpoint and restores sample order`() {
        val sizes = mutableListOf<Int>()
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/v1/srtm30m") { exchange ->
            val locations = mapper.readTree(exchange.requestBody.readAllBytes()).path("locations").asString().split('|')
            sizes.add(locations.size)
            val results = locations.map { mapOf("elevation" to it.split(',')[0].toDouble(), "dataset" to "srtm30m") }
            val bytes = mapper.writeValueAsBytes(mapOf("status" to "OK", "results" to results))
            exchange.sendResponseHeaders(200, bytes.size.toLong()); exchange.responseBody.use { it.write(bytes) }
        }
        server.start()
        try {
            val client = OpenTopoDataClient(mapper,"http://127.0.0.1:${server.address.port}/v1/srtm30m")
            val points = (0..100).map { ElevationLocation(it / 1000.0,126.0) }
            val result = client.lookup(points + points.first())
            assertEquals(listOf(100,1),sizes)
            assertEquals(points.map { it.latitude } + points.first().latitude,result)
        } finally { server.stop(0) }
    }

    @Test fun `missing data is never converted to sea level`() {
        val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0)
        server.createContext("/") { exchange ->
            val bytes = """{"status":"OK","results":[{"elevation":null}]}""".toByteArray()
            exchange.sendResponseHeaders(200,bytes.size.toLong()); exchange.responseBody.use { it.write(bytes) }
        }
        server.start()
        try {
            val client = OpenTopoDataClient(mapper,"http://127.0.0.1:${server.address.port}/")
            assertEquals(422, assertThrows(ResponseStatusException::class.java) { client.lookup(listOf(ElevationLocation(37.0,126.0))) }.statusCode.value())
        } finally { server.stop(0) }
    }
}
