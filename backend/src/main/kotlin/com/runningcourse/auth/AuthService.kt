package com.runningcourse.auth

import org.springframework.http.HttpStatus
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
class AuthService(private val repository: AuthRepository) {
    private val encoder = BCryptPasswordEncoder(12)
    private val dummyHash = requireNotNull(encoder.encode("unmatched-account-password"))

    private fun email(value: String) = value.trim().lowercase(Locale.ROOT)
    private fun validEmail(value: String) = email(value).length in 3..254 &&
        email(value).matches(Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$"))

    private fun validateRegistration(request: Credentials) {
        if (!validEmail(request.email) || request.password.codePointCount(0, request.password.length) !in 10..15) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일과 비밀번호(10자 이상, 15자 이하)를 확인해 주세요.")
        }
    }

    private fun validateLogin(request: Credentials) {
        if (!validEmail(request.email) || request.password.length < 10 ||
            request.password.toByteArray(Charsets.UTF_8).size > 72) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "이메일 또는 비밀번호를 확인해 주세요.")
        }
    }

    @Transactional
    fun register(request: Credentials): LoginResult {
        validateRegistration(request)
        if (request.displayName.trim().length !in 1..40) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "닉네임은 1~40자로 입력해 주세요.")
        // 사전 조회만으로 중복을 판단하지 않고 DB UNIQUE 제약으로 동시 가입도 처리합니다.
        val passwordHash = requireNotNull(encoder.encode(request.password))
        val user = repository.insertUser(email(request.email), request.displayName.trim(), passwordHash)
            ?: throw ResponseStatusException(HttpStatus.CONFLICT, "이미 가입된 이메일입니다.")
        return newSession(user)
    }

    @Transactional
    fun login(request: Credentials, previousAuthorization: String?): LoginResult {
        validateLogin(request)
        val row = repository.findCredentials(email(request.email))
        val valid = encoder.matches(request.password, row?.passwordHash ?: dummyHash)
        if (row == null || !valid) throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "이메일 또는 비밀번호를 확인해 주세요.")
        logout(previousAuthorization)
        return newSession(row.user)
    }

    private fun newSession(user: UserView): LoginResult {
        val token = Base64.getUrlEncoder().withoutPadding().encodeToString(ByteArray(32).also { SecureRandom().nextBytes(it) })
        repository.deleteExpiredSessions()
        repository.insertSession(hash(token), user.id)
        return LoginResult(user, token)
    }

    fun current(authorization: String?): UserView? {
        val token = bearer(authorization) ?: return null
        return repository.findSessionUser(hash(token))
    }
    fun requireUser(authorization: String?): UserView = current(authorization)
        ?: throw ResponseStatusException(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.")
    fun logout(authorization: String?) { bearer(authorization)?.let { repository.deleteSession(hash(it)) } }
    private fun bearer(value: String?): String? = value?.takeIf { it.startsWith("Bearer ") }?.substring(7)?.takeIf { it.length == 43 }
    private fun hash(token: String) = MessageDigest.getInstance("SHA-256").digest(token.toByteArray()).joinToString("") { "%02x".format(it) }
}
