package com.runningcourse.auth

import org.springframework.dao.DuplicateKeyException
import org.springframework.http.HttpStatus
import org.springframework.jdbc.core.JdbcTemplate
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import java.security.MessageDigest
import java.security.SecureRandom
import java.util.Base64
import java.util.Locale

data class UserView(val id: Long, val email: String, val displayName: String)
data class Credentials(val email: String, val password: String, val displayName: String = "")
data class LoginResult(val user: UserView, val token: String)

@Service
class AuthService(private val jdbc: JdbcTemplate) {
    private val encoder = BCryptPasswordEncoder(12)
    private val dummyHash = encoder.encode("unmatched-account-password")

    private fun email(value: String) = value.trim().lowercase(Locale.ROOT)
    private fun validate(request: Credentials) {
        if (email(request.email).length !in 3..254 || !email(request.email).matches(Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")) ||
            request.password.length < 10 || request.password.toByteArray(Charsets.UTF_8).size > 72) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일과 비밀번호(10자 이상, UTF-8 72바이트 이하)를 확인해 주세요.")
        }
    }

    @Transactional
    fun register(request: Credentials): LoginResult {
        validate(request)
        if (request.displayName.trim().length !in 1..40) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "닉네임은 1~40자로 입력해 주세요.")
        val user = try {
            jdbc.queryForObject("INSERT INTO app_users(email, display_name, password_hash) VALUES (?, ?, ?) RETURNING id, email, display_name",
                { rs, _ -> UserView(rs.getLong("id"), rs.getString("email"), rs.getString("display_name")) },
                email(request.email), request.displayName.trim(), encoder.encode(request.password))
        } catch (_: DuplicateKeyException) { throw ResponseStatusException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.") }
        return newSession(user)
    }

    @Transactional
    fun login(request: Credentials, previousAuthorization: String?): LoginResult {
        validate(request)
        val row = jdbc.query("SELECT id, email, display_name, password_hash FROM app_users WHERE email = ?",
            { rs, _ -> Pair(UserView(rs.getLong("id"), rs.getString("email"), rs.getString("display_name")), rs.getString("password_hash")) }, email(request.email)).singleOrNull()
        val valid = encoder.matches(request.password, row?.second ?: dummyHash)
        if (row == null || !valid) throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해 주세요.")
        logout(previousAuthorization)
        return newSession(row.first)
    }

    private fun newSession(user: UserView): LoginResult {
        val token = Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(32).also { SecureRandom().nextBytes(it) })
        jdbc.update("DELETE FROM user_sessions WHERE expires_at <= CURRENT_TIMESTAMP")
        jdbc.update("INSERT INTO user_sessions(token_hash, user_id, expires_at) VALUES (?, ?, CURRENT_TIMESTAMP + INTERVAL '7 days')", hash(token), user.id)
        return LoginResult(user, token)
    }

    fun current(authorization: String?): UserView? {
        val token = bearer(authorization) ?: return null
        return jdbc.query("SELECT u.id, u.email, u.display_name FROM user_sessions s JOIN app_users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP",
            { rs, _ -> UserView(rs.getLong("id"), rs.getString("email"), rs.getString("display_name")) }, hash(token)).singleOrNull()
    }
    fun requireUser(authorization: String?): UserView = current(authorization)
        ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.")
    fun logout(authorization: String?) { bearer(authorization)?.let { jdbc.update("DELETE FROM user_sessions WHERE token_hash = ?", hash(it)) } }
    private fun bearer(value: String?): String? = value?.takeIf { it.startsWith("Bearer ") }?.substring(7)?.takeIf { it.length == 43 }
    private fun hash(token: String) = MessageDigest.getInstance("SHA-256").digest(token.toByteArray()).joinToString("") { "%02x".format(it) }
}
