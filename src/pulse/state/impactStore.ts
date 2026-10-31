// Impact assumptions persisted in localStorage and read through useSyncExternalStore, so the static HTML
// (rendered with defaults) hydrates cleanly and the saved values apply right after.

import { DEFAULT_IMPACT, sanitizeImpact, type ImpactAssumptions } from "../engine";

// v2: default pumping energy changed to 0.8 kWh/m³ (150 m lift), so earlier saved test values are not reused.
const KEY = "pulse.impact.v2";
const listeners = new Set<() => void>();
/** Cached snapshot: useSyncExternalStore needs the same object until something changes. */
let cache: ImpactAssumptions | null = null;

export function getImpactSnapshot(): ImpactAssumptions {
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? sanitizeImpact(JSON.parse(raw)) : DEFAULT_IMPACT;
  } catch {
    cache = DEFAULT_IMPACT;
  }
  return cache;
}

export const getImpactServerSnapshot = (): ImpactAssumptions => DEFAULT_IMPACT;

export function saveImpact(next: ImpactAssumptions): void {
  cache = sanitizeImpact(next);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    // Storage blocked (private mode): keep the in-memory value for this visit.
  }
  listeners.forEach((l) => l());
}

export function subscribeImpact(listener: () => void): () => void {
  listeners.add(listener);
  // Keep other tabs in sync.
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
