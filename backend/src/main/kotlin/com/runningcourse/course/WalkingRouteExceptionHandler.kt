package com.runningcourse.course

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice
import java.time.OffsetDateTime

// Return the same explicit error contract on both walking-route endpoints.
@RestControllerAdvice(assignableTypes = [KakaoWalkingRouteController::class])
class WalkingRouteExceptionHandler {
    data class LimitError(
        val status: Int,
        val code: String,
        val message: String,
        val scope: WalkingRouteQuotaScope,
        val limit: Int,
        val resetsAt: OffsetDateTime,
    )

    @ExceptionHandler(WalkingRouteLimitExceededException::class)
    fun limitExceeded(error: WalkingRouteLimitExceededException): ResponseEntity<LimitError> =
        ResponseEntity.status(HttpStatus.TOO_MANY_REQUESTS).body(
            LimitError(429, error.code, requireNotNull(error.reason), error.scope, error.limit, error.resetsAt),
        )
}
