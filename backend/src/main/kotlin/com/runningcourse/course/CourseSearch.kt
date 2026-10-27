package com.runningcourse.course

class InvalidCourseSearchException(message: String) : RuntimeException(message)

data class CourseSearch(
    val latitude: Double? = null,
    val longitude: Double? = null,
    val radiusMeters: Int? = null,
    val targetDistanceMeters: Int? = null,
    val minimumDistanceMeters: Int? = null,
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
        if (targetDistanceMeters != null && targetDistanceMeters !in setOf(3000, 5000, 10000)) {
            throw InvalidCourseSearchException("목표 거리는 3000m, 5000m, 10000m 중에서 선택해 주세요.")
        }
        if (minimumDistanceMeters != null && minimumDistanceMeters !in 1..100_000) {
            throw InvalidCourseSearchException("최소 거리는 1~100000m 사이여야 합니다.")
        }
        if (targetDistanceMeters != null && minimumDistanceMeters != null) {
            throw InvalidCourseSearchException("목표 거리와 최소 거리는 함께 지정할 수 없습니다.")
        }
    }

    val center: StartLocation?
        get() = if (latitude != null && longitude != null) StartLocation(latitude, longitude) else null

    val effectiveRadiusMeters: Int?
        get() = if (center != null) radiusMeters ?: 2_000 else null

    // 저장 거리는 정수 m이므로 하한 초과는 다음 정수부터 포함합니다.
    val minDistanceMeters: Int?
        get() = when (targetDistanceMeters) {
            3000 -> 1
            5000 -> 4001
            10000 -> 7001
            else -> null
        }

    val maxDistanceMeters: Int?
        get() = when (targetDistanceMeters) {
            3000 -> 4000
            5000 -> 7000
            10000 -> 11000
            else -> null
        }
}
