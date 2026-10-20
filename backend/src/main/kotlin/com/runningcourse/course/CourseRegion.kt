package com.runningcourse.course

import java.sql.ResultSet
import java.time.OffsetDateTime

data class CourseRegion(
    val sido: String?,
    val sigungu: String?,
    val eupMyeonDong: String?,
    val source: String,
    val resolvedAt: OffsetDateTime,
)

fun interface CourseRegionResolver {
    fun resolve(latitude: Double, longitude: Double): CourseRegion?
}

fun ResultSet.readCourseRegion(): CourseRegion? {
    val sido = getString("region_sido")
    val sigungu = getString("region_sigungu")
    val eupMyeonDong = getString("region_eup_myeon_dong")
    if (sido == null && sigungu == null && eupMyeonDong == null) return null
    return CourseRegion(
        sido = sido,
        sigungu = sigungu,
        eupMyeonDong = eupMyeonDong,
        source = getString("region_source") ?: "OpenStreetMap Nominatim",
        resolvedAt = getObject("region_resolved_at", OffsetDateTime::class.java),
    )
}
