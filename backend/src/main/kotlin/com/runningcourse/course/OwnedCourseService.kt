package com.runningcourse.course

import com.runningcourse.auth.AuthService
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

data class MyCourse(val id: Long, val name: String, val distanceMeters: Int, val published: Boolean)
data class VisibilityRequest(val published: Boolean)

@Service
class OwnedCourseService(private val repository: OwnedCourseRepository) {
    @Transactional(readOnly = true)
    fun list(owner: Long): List<MyCourse> = repository.findAll(owner)

    @Transactional(readOnly = true)
    fun detail(id: Long, owner: Long): CourseDetail = repository.findById(id, owner)
        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "코스를 찾을 수 없습니다.")

    @Transactional
    fun update(id: Long, owner: Long, request: CreateCourseRequest): CreatedCourse {
        if (!repository.lockOwned(id, owner)) throw ResponseStatusException(HttpStatus.NOT_FOUND, "코스를 찾을 수 없습니다.")
        request.validate()
        val result = repository.update(id, owner, request)
        return result ?: throw ResponseStatusException(HttpStatus.BAD_REQUEST, "코스 거리는 1m~100km여야 합니다.")
    }
    @Transactional
    fun visibility(id: Long, owner: Long, published: Boolean) {
        if (!repository.updateVisibility(id, owner, published))
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "코스를 찾을 수 없습니다.")
    }
    @Transactional
    fun delete(id: Long, owner: Long) {
        if (!repository.delete(id, owner))
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "코스를 찾을 수 없습니다.")
    }
}

@RestController
@RequestMapping("/api/my/courses")
class OwnedCourseController(private val auth: AuthService, private val courses: OwnedCourseService) {
    @GetMapping fun list(@RequestHeader("Authorization", required = false) authorization: String?) = courses.list(auth.requireUser(authorization).id)
    @GetMapping("/{id}") fun detail(@PathVariable id: Long, @RequestHeader("Authorization", required = false) authorization: String?) = courses.detail(id, auth.requireUser(authorization).id)
    @PutMapping("/{id}") fun update(@PathVariable id: Long, @RequestHeader("Authorization", required = false) authorization: String?, @RequestBody request: CreateCourseRequest) = courses.update(id, auth.requireUser(authorization).id, request)
    @PatchMapping("/{id}/visibility") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun visibility(@PathVariable id: Long, @RequestHeader("Authorization", required = false) authorization: String?, @RequestBody request: VisibilityRequest) = courses.visibility(id, auth.requireUser(authorization).id, request.published)
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: Long, @RequestHeader("Authorization", required = false) authorization: String?) = courses.delete(id, auth.requireUser(authorization).id)
}
