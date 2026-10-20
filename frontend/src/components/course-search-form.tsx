"use client";
import uiStyles from "@/styles/ui.module.css";

import searchStyles from "@/components/course-search-form.module.css";
import Form from "next/form";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  RADIUS_OPTIONS,
  TARGET_DISTANCE_OPTIONS,
  type CourseSearchFilters,
} from "@/lib/course-search";
type Location = {
  latitude: number;
  longitude: number;
};
type LocationRegion = {
  sido: string | null;
  sigungu: string | null;
  eupMyeonDong: string | null;
};
export function CourseSearchForm({
  filters,
  size,
}: {
  filters: CourseSearchFilters;
  size: number;
}) {
  const initialLocation =
    filters.latitude !== undefined && filters.longitude !== undefined
      ? { latitude: filters.latitude, longitude: filters.longitude }
      : undefined;
  const [location, setLocation] = useState<Location | undefined>(
    initialLocation,
  );
  const [locationRegion, setLocationRegion] = useState("");
  const [locationLookupVersion, setLocationLookupVersion] = useState(0);
  const [isLocating, setIsLocating] = useState(false);
  const [distanceChoice, setDistanceChoice] = useState(
    filters.minimumDistanceMeters !== undefined
      ? "greater"
      : String(filters.targetDistanceMeters ?? ""),
  );
  const latitude = location?.latitude;
  const longitude = location?.longitude;

  useEffect(() => {
    if (latitude === undefined || longitude === undefined) return;
    const controller = new AbortController();
    const query = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
    });
    void fetch(`/api/regions/reverse?${query}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((result: { region: LocationRegion | null } | null) => {
        const region = result?.region;
        if (!region) return;
        setLocationRegion(
          [region.sido, region.sigungu, region.eupMyeonDong]
            .filter(Boolean)
            .join(" "),
        );
      })
      .catch(() => {
        // Address lookup is optional; course search still works with coordinates.
      });
    return () => controller.abort();
  }, [latitude, longitude, locationLookupVersion]);
  const hasCustomRadius =
    filters.radiusMeters !== undefined &&
    !RADIUS_OPTIONS.includes(
      filters.radiusMeters as (typeof RADIUS_OPTIONS)[number],
    );
  const hasCustomTarget =
    filters.targetDistanceMeters !== undefined &&
    !TARGET_DISTANCE_OPTIONS.includes(
      filters.targetDistanceMeters as (typeof TARGET_DISTANCE_OPTIONS)[number],
    );
  function findCurrentLocation() {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocationRegion("");
        setLocation({
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
        });
        setLocationLookupVersion((version) => version + 1);
        setIsLocating(false);
      },
      () => setIsLocating(false),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  return (
    <section
      className={searchStyles.searchPanel}
      aria-labelledby="course-search-title"
    >
      <div className={searchStyles.searchHeading}>
        <div>
          <p className={uiStyles.eyebrow}>SEARCH COURSES</p>
          <h2 id="course-search-title">나에게 맞는 코스 찾기</h2>
        </div>
        {(initialLocation || filters.targetDistanceMeters || filters.minimumDistanceMeters !== undefined) && (
          <Link
            className={searchStyles.searchReset}
            href={size === 6 ? "/" : `/?size=${size}`}
          >
            조건 초기화
          </Link>
        )}
      </div>
      <Form
        action="/"
        className={searchStyles.courseSearchForm}
        prefetch={false}
      >
        <input type="hidden" name="size" value={size} />
        {distanceChoice !== "" && distanceChoice !== "greater" && (
          <input type="hidden" name="targetDistanceMeters" value={distanceChoice} />
        )}
        {distanceChoice === "greater" && (
          <input type="hidden" name="minimumDistanceMeters" value="10001" />
        )}
        {location && (
          <>
            <input type="hidden" name="latitude" value={location.latitude} />
            <input type="hidden" name="longitude" value={location.longitude} />
          </>
        )}
        <fieldset className={searchStyles.locationField}>
          <legend className={uiStyles.srOnly}>출발 위치</legend>
          <div className={searchStyles.locationControl}>
            <span className={searchStyles.controlIcon} aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            </span>
            <span className={searchStyles.locationValue}>
              {locationRegion || (location ? "현재 위치" : "출발 위치 설정")}
            </span>
            <button
              className={searchStyles.locationButton}
              type="button"
              onClick={findCurrentLocation}
              disabled={isLocating}
            >
              {isLocating ? "확인 중" : location ? "다시 찾기" : "내 위치"}
            </button>
          </div>
          {locationRegion && (
            <span className={uiStyles.srOnly} aria-live="polite">현재 위치: {locationRegion}</span>
          )}
        </fieldset>
        <label className={`${searchStyles.searchField} ${searchStyles.radiusField}`}>
          <span className={searchStyles.fieldLabel}>반경</span>
          <select
            name="radiusMeters"
            defaultValue={filters.radiusMeters ?? 2000}
            disabled={!location}
            aria-label="검색 반경"
          >
            {hasCustomRadius && (
              <option value={filters.radiusMeters}>
                {filters.radiusMeters! / 1000}km 이내
              </option>
            )}
            {RADIUS_OPTIONS.map((radius) => (
              <option key={radius} value={radius}>
                {radius / 1000}km 이내
              </option>
            ))}
          </select>
        </label>
        <fieldset className={searchStyles.distanceField}>
          <legend>목표 거리</legend>
          <div className={searchStyles.distanceChips}>
            <label className={searchStyles.distanceChip}>
              <input
                type="radio"
                name="distanceChoice"
                value=""
                checked={distanceChoice === ""}
                onChange={() => setDistanceChoice("")}
              />
              <span>전체</span>
            </label>
            {hasCustomTarget && (
              <label className={searchStyles.distanceChip}>
                <input
                  type="radio"
                  name="distanceChoice"
                  value={filters.targetDistanceMeters}
                  checked={distanceChoice === String(filters.targetDistanceMeters)}
                  onChange={() => setDistanceChoice(String(filters.targetDistanceMeters))}
                />
                <span>{filters.targetDistanceMeters! / 1000}km</span>
              </label>
            )}
            {TARGET_DISTANCE_OPTIONS.map((distance) => (
              <label className={searchStyles.distanceChip} key={distance}>
                <input
                  type="radio"
                  name="distanceChoice"
                  value={distance}
                  checked={distanceChoice === String(distance)}
                  onChange={() => setDistanceChoice(String(distance))}
                />
                <span>{distance / 1000}km</span>
              </label>
            ))}
            <label className={searchStyles.distanceChip}>
              <input
                type="radio"
                name="distanceChoice"
                value="greater"
                checked={distanceChoice === "greater"}
                onChange={() => setDistanceChoice("greater")}
              />
              <span>그 이상</span>
            </label>
          </div>
        </fieldset>
        <button className={searchStyles.searchSubmit} type="submit">
          코스 찾기
        </button>
      </Form>
    </section>
  );
}
