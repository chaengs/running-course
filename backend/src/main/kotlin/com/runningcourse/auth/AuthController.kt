package com.runningcourse.auth

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/auth")
class AuthController(private val auth: AuthService) {
    @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED)
    fun register(@RequestBody request: Credentials): LoginResult = auth.register(request)
    @PostMapping("/login")
    fun login(@RequestBody request: Credentials, @RequestHeader("Authorization", required = false) authorization: String?): LoginResult = auth.login(request, authorization)
    @GetMapping("/me")
    fun me(@RequestHeader("Authorization", required = false) authorization: String?): UserView = auth.requireUser(authorization)
    @PostMapping("/logout") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun logout(@RequestHeader("Authorization", required = false) authorization: String?) = auth.logout(authorization)
}
