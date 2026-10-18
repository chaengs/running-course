"use client";

import Form from "next/form";
import Link from "next/link";
import { useState } from "react";
import {
  RADIUS_OPTIONS,
  TARGET_DISTANCE_OPTIONS,
  type CourseSearchFilters,
} from "@/lib/course-search";

type Location = { latitude: number; longitude: number };

function geolocationErrorMessage(error: GeolocationPositionError) {
  if (error.code === error.PERMISSION_DENIED) return "위치 권한이 거부됐어요. 브라우저 설정에서 권한을 허용해 주세요.";
  if (error.code === error.POSITION_UNAVAILABLE) return "현재 위치를 확인할 수 없어요. 잠시 후 다시 시도해 주세요.";
  return "위치 확인 시간이 초과됐어요. 잠시 후 다시 시도해 주세요.";
}

export function CourseSearchForm({ filters, size }: { filters: CourseSearchFilters; size: number }) {
  const initialLocation = filters.latitude !== undefined && filters.longitude !== undefined
    ? { latitude: filters.latitude, longitude: filters.longitude }
    : undefined;
  const [location, setLocation] = useState<Location | undefined>(initialLocation);
  const [locationStatus, setLocationStatus] = useState(initialLocation ? "검색 위치가 설정되어 있어요." : "");
  const [isLocating, setIsLocating] = useState(false);
  const hasCustomRadius = filters.radiusMeters !== undefined &&
    !RADIUS_OPTIONS.includes(filters.radiusMeters as (typeof RADIUS_OPTIONS)[number]);
  const hasCustomTarget = filters.targetDistanceMeters !== undefined &&
    !TARGET_DISTANCE_OPTIONS.includes(filters.targetDistanceMeters as (typeof TARGET_DISTANCE_OPTIONS)[number]);

  function findCurrentLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("이 브라우저에서는 현재 위치를 사용할 수 없어요.");
      return;
    }

    setIsLocating(true);
    setLocationStatus("현재 위치를 확인하고 있어요…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({
          latitude: Number(coords.latitude.toFixed(6)),
          longitude: Number(coords.longitude.toFixed(6)),
        });
        setLocationStatus("현재 위치를 찾았어요. ‘코스 찾기’를 눌러 검색해 보세요.");
        setIsLocating(false);
      },
      (error) => {
        setLocationStatus(geolocationErrorMessage(error));
        setIsLocating(false);
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  }

  function clearLocation() {
    setLocation(undefined);
    setLocationStatus("위치 조건을 해제했어요.");
  }

  return (
    <section className="search-panel" aria-labelledby="course-search-title">
      <div className="search-heading">
        <div>
          <p className="eyebrow">SEARCH COURSES</p>
          <h2 id="course-search-title">나에게 맞는 코스 찾기</h2>
        </div>
        {(initialLocation || filters.targetDistanceMeters) && <Link className="search-reset" href={size === 6 ? "/" : `/?size=${size}`}>조건 초기화</Link>}
      </div>
      <Form action="/" className="course-search-form" prefetch={false}>
        <input type="hidden" name="size" value={size} />
        {location && <>
          <input type="hidden" name="latitude" value={location.latitude} />
          <input type="hidden" name="longitude" value={location.longitude} />
        </>}
        <fieldset className="location-field">
          <legend>출발 위치</legend>
          <div className="location-actions">
            <button className="location-button" type="button" onClick={findCurrentLocation} disabled={isLocating}>
              <span aria-hidden="true">⌖</span>{isLocating ? "위치 확인 중" : location ? "위치 다시 찾기" : "현재 위치 사용"}
            </button>
            {location && <button className="location-clear" type="button" onClick={clearLocation}>위치 해제</button>}
          </div>
          <p className="location-status" aria-live="polite">{locationStatus || "버튼을 누르면 브라우저가 위치 권한을 요청해요."}</p>
        </fieldset>
        <label className="search-field">
          <span>검색 반경</span>
          <select name="radiusMeters" defaultValue={filters.radiusMeters ?? 2000} disabled={!location}>
            {hasCustomRadius && <option value={filters.radiusMeters}>{filters.radiusMeters! / 1000}km 이내</option>}
            {RADIUS_OPTIONS.map((radius) => <option key={radius} value={radius}>{radius / 1000}km 이내</option>)}
          </select>
          <small>{location ? "코스 출발점까지의 직선거리" : "위치를 먼저 설정해 주세요"}</small>
        </label>
        <label className="search-field">
          <span>목표 거리</span>
          <select name="targetDistanceMeters" defaultValue={filters.targetDistanceMeters ?? ""}>
            <option value="">전체 거리</option>
            {hasCustomTarget && <option value={filters.targetDistanceMeters}>{filters.targetDistanceMeters! / 1000}km 코스</option>}
            {TARGET_DISTANCE_OPTIONS.map((distance) => <option key={distance} value={distance}>{distance / 1000}km 코스</option>)}
          </select>
          <small>선택한 거리의 ±10% 범위</small>
        </label>
        <button className="search-submit" type="submit">코스 찾기</button>
      </Form>
    </section>
  );
}
