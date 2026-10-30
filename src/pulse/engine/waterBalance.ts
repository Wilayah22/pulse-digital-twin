// FAO-56 root-zone soil water balance (Chapter 8, Eq. 85) for a single basin.

import { EFFECTIVE_RAIN_FACTOR, MIN_EFFECTIVE_RAIN } from "./constants";
import type { BasinHealth, SoilParams } from "./types";

/** Total available water in the root zone (mm), Eq. 82. */
export function totalAvailableWater(soil: SoilParams): number {
  return 1000 * (soil.thetaFC - soil.thetaWP) * soil.rootDepth;
}

/** Readily available water (mm), Eq. 83. */
export function readilyAvailableWater(soil: SoilParams): number {
  return soil.depletionFraction * totalAvailableWater(soil);
}

/** Water stress coefficient Ks (Eq. 84). 1 = no stress, 0 = wilting point. */
export function waterStressCoefficient(depletion: number, taw: number, raw: number): number {
  if (depletion <= raw) return 1;
  if (depletion >= taw) return 0;
  return (taw - depletion) / (taw - raw);
}

/** Effective rainfall: light showers evaporate before reaching the root zone. */
export function effectiveRainfall(rain: number): number {
  return rain < MIN_EFFECTIVE_RAIN ? 0 : rain * EFFECTIVE_RAIN_FACTOR;
}

/** Available-water content as % of TAW (100 % = field capacity). */
export function moisturePercent(depletion: number, taw: number): number {
  return Math.max(0, Math.min(100, (100 * (taw - depletion)) / taw));
}

/** Convert a volume (m³) spread over an area (m²) into a depth (mm). */
export function volumeToDepth(volume: number, area: number): number {
  return area > 0 ? (volume * 1000) / area : 0;
}

/** Convert a depth (mm) over an area (m²) into a volume (m³). */
export function depthToVolume(depth: number, area: number): number {
  return (depth * area) / 1000;
}

export interface WaterInputResult {
  depletion: number; // mm after inputs
  deepPercolation: number; // mm drained below the root zone
}

/** Add water (irrigation + effective rain) to the root zone; anything above field capacity percolates. */
export function applyWaterInputs(depletion: number, inputDepth: number): WaterInputResult {
  const after = depletion - inputDepth;
  if (after < 0) return { depletion: 0, deepPercolation: -after };
  return { depletion: after, deepPercolation: 0 };
}

/** Remove actual evapotranspiration; depletion cannot exceed TAW. */
export function applyEvapotranspiration(depletion: number, etcAdj: number, taw: number): number {
  return Math.min(taw, depletion + Math.max(0, etcAdj));
}

/** Basin health classification used by the digital twin colours. */
export function classifyHealth(depletion: number, taw: number, raw: number): BasinHealth {
  if (depletion <= raw) return "healthy";
  if (depletion <= raw + 0.5 * (taw - raw)) return "moderate";
  return "critical";
}
