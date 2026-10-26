package com.runningcourse.course

import org.springframework.beans.factory.annotation.Value
import org.springframework.stereotype.Component
import java.util.concurrent.CompletableFuture
import java.util.concurrent.CompletionException
import java.util.concurrent.ConcurrentHashMap

@Component
class WalkingRouteCache(
    @Value("\${geocoding.kakao.walking.cache-ttl-seconds:900}") private val ttlSeconds: Long,
    @Value("\${geocoding.kakao.walking.cache-max-entries:2000}") private val maxEntries: Int,
) {
    private data class Entry(val response: KakaoWalkingRouteResponse, val expiresAt: Long)
    private val entries = ConcurrentHashMap<String, Entry>()
    private val inFlight = ConcurrentHashMap<String, CompletableFuture<KakaoWalkingRouteResponse>>()

    fun getOrLoad(key: String, loader: () -> KakaoWalkingRouteResponse): KakaoWalkingRouteResponse {
        cached(key)?.let { return it }

        val pending = CompletableFuture<KakaoWalkingRouteResponse>()
        val existing = inFlight.putIfAbsent(key, pending)
        if (existing != null) {
            return try {
                existing.join()
            } catch (error: CompletionException) {
                throw (error.cause ?: error)
            }
        }

        try {
            // A concurrent request may have populated the cache before this request became the loader.
            val response = cached(key) ?: loader().also { put(key, it) }
            pending.complete(response)
            return response
        } catch (error: Throwable) {
            pending.completeExceptionally(error)
            throw error
        } finally {
            inFlight.remove(key, pending)
        }
    }

    private fun cached(key: String): KakaoWalkingRouteResponse? {
        val entry = entries[key] ?: return null
        if (entry.expiresAt > System.currentTimeMillis()) return entry.response
        entries.remove(key, entry)
        return null
    }

    private fun put(key: String, response: KakaoWalkingRouteResponse) {
        val now = System.currentTimeMillis()
        entries.entries.removeIf { it.value.expiresAt <= now }
        if (entries.size >= maxEntries.coerceAtLeast(1)) {
            entries.keys.firstOrNull()?.let(entries::remove)
        }
        entries[key] = Entry(response, now + ttlSeconds.coerceAtLeast(1) * 1000)
    }
}
