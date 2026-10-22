package com.runningcourse.course

import com.runningcourse.auth.AuthService
import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.*

@RestController
@RequestMapping("/api/my/bookmarks")
class CourseBookmarkController(private val auth: AuthService, private val bookmarks: CourseBookmarkService) {
    @GetMapping
    fun list(@RequestParam(defaultValue = "0") page: Int, @RequestHeader("Authorization", required = false) authorization: String?) =
        bookmarks.list(auth.requireUser(authorization).id, page)

    @GetMapping("/{courseId}")
    fun status(@PathVariable courseId: Long, @RequestHeader("Authorization", required = false) authorization: String?) =
        bookmarks.status(auth.requireUser(authorization).id, courseId)

    @PutMapping("/{courseId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun add(@PathVariable courseId: Long, @RequestHeader("Authorization", required = false) authorization: String?) =
        bookmarks.add(auth.requireUser(authorization).id, courseId)

    @DeleteMapping("/{courseId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun remove(@PathVariable courseId: Long, @RequestHeader("Authorization", required = false) authorization: String?) =
        bookmarks.remove(auth.requireUser(authorization).id, courseId)
}
