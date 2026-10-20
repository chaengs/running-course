package com.runningcourse.course

import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Isolation
import org.springframework.transaction.annotation.Transactional
//공개 코스 전체 개수 조회
//현재 페이지에 해당하는 코스 조회
//전체 페이지 수를 계산해 응답 구성
@Service
class CourseService(private val courseRepository: CourseRepository) {
    // 목록과 전체 개수를 같은 DB 스냅샷에서 조회
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
//트랜잭션은 여러 DB 작업을 하나의 단위로 묶는 장치. 이번에는 조회만 하지만, 전체 개수와 실제 목록을 일관된 기준으로 읽기 위해 사용
    fun list(page: Int, size: Int, search: CourseSearch = CourseSearch()): CourseListResponse {
        val total = courseRepository.countPublished(search)
        return CourseListResponse(
            content = courseRepository.findPublished(size, page.toLong() * size, search),
            page = page,
            size = size,
            totalElements = total,
            totalPages = total / size + if (total % size == 0L) 0 else 1,
        )
    }

    @Transactional(readOnly = true)
    fun detail(id: Long): CourseDetail = courseRepository.findPublishedById(id)
        ?: throw CourseNotFoundException()

    @Transactional
    fun recordView(id: Long) {
        if (!courseRepository.recordPublishedView(id)) throw CourseNotFoundException()
    }
}
