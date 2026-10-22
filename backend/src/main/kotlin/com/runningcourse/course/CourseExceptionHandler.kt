package com.runningcourse.course

import org.springframework.http.HttpStatus
import org.springframework.http.ProblemDetail
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.bind.annotation.RestControllerAdvice

@RestControllerAdvice(assignableTypes = [CourseController::class])
class CourseExceptionHandler {
    // 비공개 코스의 존재 여부를 공개 API에서 구분하지 않습니다.
    @ExceptionHandler(CourseNotFoundException::class)
    fun notFound(): ProblemDetail = ProblemDetail.forStatusAndDetail(
        HttpStatus.NOT_FOUND,
        "코스를 찾을 수 없습니다.",
    )

    @ExceptionHandler(InvalidCourseSearchException::class)
    fun invalidSearch(error: InvalidCourseSearchException): ProblemDetail = ProblemDetail.forStatusAndDetail(
        HttpStatus.BAD_REQUEST,
        error.message ?: "검색 조건을 확인해 주세요.",
    )
}
