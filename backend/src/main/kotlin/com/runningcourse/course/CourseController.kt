package com.runningcourse.course

import jakarta.validation.constraints.Max
import jakarta.validation.constraints.Min
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController

//@RestController: HTTP 요청을 처리하고 반환값을 응답 본문으로 보내는 클래스
//@RequestMapping: 이 Controller가 담당할 URL
//@GetMapping: GET 요청을 연결할 함수
//@RequestParam: URL의 쿼리 파라미터를 함수 인자로 받기
//@Min, @Max: 허용하는 숫자 범위 지정

@RestController
@RequestMapping("/api/courses")
class CourseController(private val courseService: CourseService) {
    @GetMapping
    fun list(
        @RequestParam(defaultValue = "0") @Min(0) page: Int,
        @RequestParam(defaultValue = "20") @Min(1) @Max(100) size: Int,
    ): CourseListResponse = courseService.list(page, size)
}
