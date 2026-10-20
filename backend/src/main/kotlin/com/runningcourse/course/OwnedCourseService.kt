package com.runningcourse.course

import com.runningcourse.auth.AuthService
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.bind.annotation.*
import org.springframework.web.server.ResponseStatusException

data class MyCourse(
    val id: Long,
    val name: String,
    val distanceMeters: Int,
    val courseType: CourseType,
    val createdAt: java.time.OffsetDateTime,
    val region: CourseRegion?,
    val published: Boolean,
    val bookmarkCount: Long,
    val viewCount: Long,
)
data class MyCourseStats(
    val totalCourses: Long,
    val totalDistanceMeters: Long,
    val totalViews: Long,
    val totalBookmarks: Long,
    val publishedCourses: Long,
    val privateCourses: Long,
)
data class MyCoursesResponse(val content: List<MyCourse>, val stats: MyCourseStats, val page: Int, val totalPages: Long)
data class VisibilityRequest(val published: Boolean)

@Service
class OwnedCourseService(
    private val repository: OwnedCourseRepository,
    private val regionResolver: CourseRegionResolver,
) {
    @Transactional(readOnly = true)
    fun list(owner: Long, page: Int, visibility: String, sort: String): MyCoursesResponse {
        if (page !in 0..100000) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "페이지 범위가 올바르지 않습니다.")
        if (visibility !in setOf("all", "published", "private")) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "공개 범위가 올바르지 않습니다.")
        if (sort !in setOf("recent", "views", "bookmarks")) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "정렬 기준이 올바르지 않습니다.")
        val published = when (visibility) { "published" -> true; "private" -> false; else -> null }
        val total = repository.count(owner, published)
        val totalPages = (total + 5) / 6
        val safePage = if (totalPages == 0L) 0 else page.coerceAtMost((totalPages - 1).toInt())
        return MyCoursesResponse(repository.findAll(owner, safePage, 6, sort), repository.stats(owner), safePage, totalPages)
    }

    @Transactional
    fun recordView(id: Long, owner: Long) {
        // Private course opens are not public interest metrics; ignore them.
        repository.recordView(id, owner)
    }

    @Transactional(readOnly = true)
    fun detail(id: Long, owner: Long): CourseDetail = repository.findById(id, owner)
        ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "코스를 찾을 수 없습니다.")

    @Transactional
    fun update(id: Long, owner: Long, request: CreateCourseRequest): CreatedCourse {
        if (!repository.lockOwned(id, owner)) throw ResponseStatusException(HttpStatus.NOT_FOUND, "코스를 찾을 수 없습니다.")
        request.validate()
        val start = request.routeGeojson.coordinates.first()
        val region = regionResolver.resolve(latitude = start[1], longitude = start[0])
        val result = repository.update(id, owner, request, region)
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
    @GetMapping fun list(@RequestParam(defaultValue = "0") page: Int,
                         @RequestParam(defaultValue = "all") visibility: String,
                         @RequestParam(defaultValue = "recent") sort: String,
                         @RequestHeader("Authorization", required = false) authorization: String?) =
        courses.list(auth.requireUser(authorization).id, page, visibility, sort)
    @GetMapping("/{id}") fun detail(@PathVariable id: Long, @RequestHeader("Authorization", required = false) authorization: String?) = courses.detail(id, auth.requireUser(authorization).id)
    @PostMapping("/{id}/view") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun recordView(@PathVariable @jakarta.validation.constraints.Min(1) id: Long, @RequestHeader("Authorization", required = false) authorization: String?) = courses.recordView(id, auth.requireUser(authorization).id)
    @PutMapping("/{id}") fun update(@PathVariable id: Long, @RequestHeader("Authorization", required = false) authorization: String?, @RequestBody request: CreateCourseRequest) = courses.update(id, auth.requireUser(authorization).id, request)
    @PatchMapping("/{id}/visibility") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun visibility(@PathVariable id: Long, @RequestHeader("Authorization", required = false) authorization: String?, @RequestBody request: VisibilityRequest) = courses.visibility(id, auth.requireUser(authorization).id, request.published)
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    fun delete(@PathVariable id: Long, @RequestHeader("Authorization", required = false) authorization: String?) = courses.delete(id, auth.requireUser(authorization).id)
}
