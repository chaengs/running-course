package com.runningcourse.course

import java.sql.ResultSet

data class CourseRegion(
    val sido: String?,
    val sigungu: String?,
    val eupMyeonDong: String?,
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
    )
}
