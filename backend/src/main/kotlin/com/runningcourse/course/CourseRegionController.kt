package com.runningcourse.course

import org.springframework.http.HttpStatus
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import org.springframework.web.server.ResponseStatusException

data class CourseRegionLookupResponse(val region: CourseRegion?)

@RestController
@RequestMapping("/api/regions")
class CourseRegionController(private val regionResolver: CourseRegionResolver) {
    @GetMapping("/reverse")
    fun reverse(
        @RequestParam latitude: Double,
        @RequestParam longitude: Double,
    ): CourseRegionLookupResponse {
        if (!latitude.isFinite() || latitude !in -90.0..90.0 ||
            !longitude.isFinite() || longitude !in -180.0..180.0
        ) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "좌표가 올바르지 않습니다.")
        }
        return CourseRegionLookupResponse(regionResolver.resolve(latitude, longitude))
    }
}
