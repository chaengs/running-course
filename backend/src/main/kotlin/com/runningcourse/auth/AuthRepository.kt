package com.runningcourse.auth

import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.stereotype.Repository

// 인증 전용 조회 결과이며 JPA 엔티티나 HTTP 응답 모델이 아닙니다.
class UserCredentials(val user: UserView, val passwordHash: String)

@Repository
class AuthRepository(private val jdbc: JdbcTemplate) {
    fun insertUser(email: String, displayName: String, passwordHash: String): UserView? = jdbc.query(
        """
        INSERT INTO app_users(email, display_name, password_hash) VALUES (?, ?, ?)
        ON CONFLICT (email) DO NOTHING
        RETURNING id, email, display_name
        """.trimIndent(),
        { rs, _ -> UserView(rs.getLong("id"), rs.getString("email"), rs.getString("display_name")) },
        email, displayName, passwordHash,
    ).singleOrNull()

    fun findCredentials(email: String): UserCredentials? = jdbc.query(
        "SELECT id, email, display_name, password_hash FROM app_users WHERE email = ?",
        { rs, _ -> UserCredentials(UserView(rs.getLong("id"), rs.getString("email"), rs.getString("display_name")), rs.getString("password_hash")) }, email,
    ).singleOrNull()

    fun deleteExpiredSessions() { jdbc.update("DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP") }
    fun insertSession(tokenHash: String, userId: Long) {
        jdbc.update("INSERT INTO user_sessions(token_hash, user_id, expires_at) VALUES (?, ?, CURRENT_TIMESTAMP + INTERVAL '7 days')", tokenHash, userId)
    }
    fun findSessionUser(tokenHash: String): UserView? = jdbc.query(
        """
        SELECT u.id, u.email, u.display_name FROM user_sessions s
        JOIN app_users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP
        """.trimIndent(),
        { rs, _ -> UserView(rs.getLong("id"), rs.getString("email"), rs.getString("display_name")) }, tokenHash,
    ).singleOrNull()
    fun deleteSession(tokenHash: String) { jdbc.update("DELETE FROM user_sessions WHERE token_hash = ?", tokenHash) }
}
