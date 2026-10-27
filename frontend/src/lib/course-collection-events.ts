"use client";

// Only a revision is shared, never personal course or bookmark data.
let revision = 0;
const listeners = new Set<() => void>();

export function courseCollectionsChanged() {
  revision += 1;
  listeners.forEach((listener) => listener());
  return listeners.size > 0;
}

export function getCourseCollectionRevision() {
  return revision;
}

export function subscribeToCourseCollections(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
