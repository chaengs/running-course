package com.runningcourse

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
class RunningCourseApplication

fun main(args: Array<String>) {
	runApplication<RunningCourseApplication>(*args)
}
