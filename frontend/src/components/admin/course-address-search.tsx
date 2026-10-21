"use client";

import mapStyles from "@/components/admin/editor-map.module.css";
import { useEffect, useRef, useState, type ChangeEvent } from "react";

export type AddressSearchResult = {
  addressName: string;
  roadAddressName: string | null;
  latitude: number;
  longitude: number;
  placeName: string | null;
};

function getSecondaryLabel(result: AddressSearchResult) {
  if (result.placeName) return result.roadAddressName ?? result.addressName;
  return result.roadAddressName && result.addressName !== result.roadAddressName
    ? result.addressName
    : null;
}

const SEARCH_DEBOUNCE_MS = 350;

export function CourseAddressSearch({
  onSelect,
}: {
  onSelect: (result: AddressSearchResult) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AddressSearchResult[]>([]);
  const [pending, setPending] = useState(false);
  const activeRequest = useRef<AbortController | null>(null);
  const ignoredQuery = useRef("");

  useEffect(() => {
    const normalized = query.trim();
    if (normalized.length < 2) return;
    if (ignoredQuery.current === normalized) {
      ignoredQuery.current = "";
      return;
    }

    let request: AbortController | null = null;
    const timer = setTimeout(() => {
      request = new AbortController();
      activeRequest.current = request;
      setPending(true);
      const params = new URLSearchParams({ query: normalized });
      void fetch(`/api/addresses/search?${params}`, {
        cache: "no-store",
        signal: AbortSignal.any([
          request.signal,
          AbortSignal.timeout(10000),
        ]),
      })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw new Error("Address search failed");
          if (activeRequest.current === request) {
            setResults(body.results as AddressSearchResult[]);
          }
        })
        .catch(() => {
          if (activeRequest.current === request && !request?.signal.aborted) {
            setResults([]);
          }
        })
        .finally(() => {
          if (activeRequest.current === request) {
            activeRequest.current = null;
            setPending(false);
          }
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      request?.abort();
      if (activeRequest.current === request) activeRequest.current = null;
    };
  }, [query]);

  function changeQuery(event: ChangeEvent<HTMLInputElement>) {
    activeRequest.current?.abort();
    activeRequest.current = null;
    ignoredQuery.current = "";
    setPending(false);
    setResults([]);
    setQuery(event.target.value);
  }

  function select(result: AddressSearchResult) {
    onSelect(result);
    const selectedLabel = result.placeName ?? result.roadAddressName ?? result.addressName;
    ignoredQuery.current = selectedLabel.trim();
    setQuery(selectedLabel);
    setResults([]);
  }

  return (
    <div className={mapStyles.addressSearch}>
      <label className={mapStyles.visuallyHidden} htmlFor="course-address-search">
        주소 검색
      </label>
      <input
        className={mapStyles.addressSearchInput}
        id="course-address-search"
        type="search"
        value={query}
        onChange={changeQuery}
        placeholder="주소를 검색해 지도를 이동하세요"
        minLength={2}
        maxLength={100}
        autoComplete="off"
        aria-busy={pending}
      />
      {results.length > 0 && (
        <ul className={mapStyles.addressSearchResults} aria-label="주소 검색 결과">
          {results.map((result) => (
            <li key={`${result.latitude},${result.longitude},${result.addressName}`}>
              <button type="button" onClick={() => select(result)}>
                <strong>{result.placeName ?? result.roadAddressName ?? result.addressName}</strong>
                {getSecondaryLabel(result) && <span>{getSecondaryLabel(result)}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
