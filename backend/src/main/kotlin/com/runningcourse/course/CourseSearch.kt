package com.runningcourse.course

class InvalidCourseSearchException(message: String) : RuntimeException(message)

data class CourseSearch(
    val latitude: Double? = null,
    val longitude: Double? = null,
    val radiusMeters: Int? = null,
    val targetDistanceMeters: Int? = null,
) {
    init {
        if ((latitude == null) != (longitude == null)) {
            throw InvalidCourseSearchException("위도와 경도를 함께 입력해 주세요.")
        }
        if (latitude != null && (!latitude.isFinite() || latitude !in -90.0..90.0)) {
            throw InvalidCourseSearchException("위도는 -90~90 사이의 유한한 숫자여야 합니다.")
        }
        if (longitude != null && (!longitude.isFinite() || longitude !in -180.0..180.0)) {
            throw InvalidCourseSearchException("경도는 -180~180 사이의 유한한 숫자여야 합니다.")
        }
        if (radiusMeters != null && latitude == null) {
            throw InvalidCourseSearchException("검색 반경을 지정하려면 위도와 경도를 함께 입력해 주세요.")
        }
        if (radiusMeters != null && radiusMeters !in 1..50_000) {
            throw InvalidCourseSearchException("검색 반경은 1~50000m 사이여야 합니다.")
        }
        if (targetDistanceMeters != null && targetDistanceMeters !in 1..100_000) {
            throw InvalidCourseSearchException("목표 거리는 1~100000m 사이여야 합니다.")
        }
    }

    val center: StartLocation?
        get() = if (latitude != null && longitude != null) StartLocation(latitude, longitude) else null

    val effectiveRadiusMeters: Int?
        get() = if (center != null) radiusMeters ?: 2_000 else null

    // 거리는 정수 m이므로 ±10% 구간의 하한은 올림, 상한은 내림합니다.
    val minDistanceMeters: Int?
        get() = targetDistanceMeters?.let { (it * 9 + 9) / 10 }

    val maxDistanceMeters: Int?
        get() = targetDistanceMeters?.let { it * 11 / 10 }
}
