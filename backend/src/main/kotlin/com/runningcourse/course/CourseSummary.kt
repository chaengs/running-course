package com.runningcourse.course

enum class CourseType { LOOP, OUT_AND_BACK }

data class StartLocation(val latitude: Double, val longitude: Double)

data class CourseSummary(
    val id: Long,
    val name: String,
    val distanceMeters: Int,
    val courseType: CourseType,
    val startLocation: StartLocation,
    val distanceToStartMeters: Double? = null,
    val region: CourseRegion? = null,
    val elevationDifficulty: ElevationDifficultyLevel? = null,
    val isBookmarked: Boolean = false,
)

data class CourseListResponse(
    val content: List<CourseSummary>,
    val page: Int,
    val size: Int,
    val totalElements: Long,
    val totalPages: Long,
)
