package com.runningcourse.course

import org.springframework.beans.factory.annotation.Value
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository
import org.springframework.stereotype.Service
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.support.TransactionTemplate
import org.springframework.web.server.ResponseStatusException
import java.time.LocalDate
import java.time.ZoneId

@Repository
class WalkingRouteUsageRepository(private val jdbc: JdbcTemplate) {
    fun reserve(date: LocalDate, userId: Long, userLimit: Int, globalLimit: Int) {
        val userCount = increment(date, "USER", userId, userLimit)
        if (userCount == null) {
            throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "오늘 사용할 수 있는 도보 경로 요청 횟수를 초과했습니다.")
        }

        val globalCount = increment(date, "GLOBAL", 0, globalLimit)
        if (globalCount == null) {
            throw ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "오늘 서비스 전체 도보 경로 요청 한도에 도달했습니다. 내일 다시 이용해 주세요.")
        }
    }

    private fun increment(date: LocalDate, scope: String, subjectId: Long, limit: Int): Int? = jdbc.query(
        """
        INSERT INTO walking_route_daily_usage(usage_date, quota_scope, subject_id, request_count)
        VALUES (?, ?, ?, 1)
        ON CONFLICT (usage_date, quota_scope, subject_id) DO UPDATE
        SET request_count = walking_route_daily_usage.request_count + 1
        WHERE walking_route_daily_usage.request_count < ?
        RETURNING request_count
        """.trimIndent(),
        { rs, _ -> rs.getInt("request_count") },
        date, scope, subjectId, limit,
    ).singleOrNull()
}

@Service
class WalkingRouteUsageService(
    private val repository: WalkingRouteUsageRepository,
    transactionManager: PlatformTransactionManager,
    @Value("\${geocoding.kakao.walking.per-user-daily-limit:100}") private val perUserDailyLimit: Int,
    @Value("\${geocoding.kakao.walking.global-daily-limit:800}") private val globalDailyLimit: Int,
) {
    private val transaction = TransactionTemplate(transactionManager)

    fun reserve(userId: Long) {
        transaction.executeWithoutResult {
            repository.reserve(LocalDate.now(ZoneId.of("Asia/Seoul")), userId, perUserDailyLimit, globalDailyLimit)
        }
    }
}
