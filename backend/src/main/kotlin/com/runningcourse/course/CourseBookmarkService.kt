package com.runningcourse.course

import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

data class BookmarkStatus(val bookmarked: Boolean)
data class BookmarkedCourse(
    val id: Long,
    val name: String,
    val distanceMeters: Int,
    val courseType: CourseType,
    val region: CourseRegion?,
    val elevationDifficulty: ElevationDifficultyLevel?,
    val published: Boolean = true,
    val isBookmarked: Boolean = true,
)
data class BookmarkPage(val content: List<BookmarkedCourse>, val page: Int, val hasNext: Boolean)

@Service
class CourseBookmarkService(private val repository: CourseBookmarkRepository) {
    @Transactional(readOnly = true)
    fun list(userId: Long, page: Int): BookmarkPage {
        if (page !in 0..100000) throw ResponseStatusException(HttpStatus.BAD_REQUEST, "페이지 범위가 올바르지 않습니다.")
        val rows = repository.findAll(userId, page)
        return BookmarkPage(rows.take(20), page, rows.size > 20)
    }

    @Transactional(readOnly = true)
    fun status(userId: Long, courseId: Long): BookmarkStatus {
        return BookmarkStatus(repository.exists(userId, courseId))
    }

    @Transactional
    fun add(userId: Long, courseId: Long) {
        requirePublished(courseId)
        repository.add(userId, courseId)
    }

    @Transactional
    fun remove(userId: Long, courseId: Long) = repository.remove(userId, courseId)

    private fun requirePublished(courseId: Long) {
        if (!repository.lockPublished(courseId))
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "공개 코스를 찾을 수 없습니다.")
    }
}
