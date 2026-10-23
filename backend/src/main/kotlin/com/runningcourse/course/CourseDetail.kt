package com.runningcourse.course

import tools.jackson.databind.JsonNode

data class CourseDetail(
    val id: Long,
    val name: String,
    val description: String,
    val distanceMeters: Int,
    val courseType: CourseType,
    val startLocation: StartLocation,
    val routeGeojson: JsonNode,
    val routeWaypoints: JsonNode? = null,
    val ownerId: Long? = null,
    val published: Boolean = true,
    val region: CourseRegion? = null,
    val elevationProfile: ElevationProfile? = null,
    val bookmarkCount: Long = 0,
    val isBookmarked: Boolean = false,
)
