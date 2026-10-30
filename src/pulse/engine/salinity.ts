// Root-zone salt balance. Irrigation water salinity (ECw) and soil salinity (ECe) are tracked separately.

import type { CropParams, SoilParams } from "./types";

/**
 * Water held in the root zone at saturation (mm). ECe is measured on a saturated paste extract,
 * which holds roughly twice the water present at field capacity.
 */
export function saturationWater(soil: SoilParams): number {
  return 2 * soil.thetaFC * soil.rootDepth * 1000;
}

/**
 * Leaching requirement (fraction of applied water), Rhoades (1974) as given in FAO-29:
 * LR = ECw / (5·ECe_t − ECw), where ECe_t is the crop's tolerable soil salinity.
 */
export function leachingRequirement(ecw: number, eceTarget: number): number {
  const denom = 5 * eceTarget - ecw;
  if (denom <= 0) return 0.9;
  return Math.min(0.9, Math.max(0, ecw / denom));
}

/**
 * Daily salt mass balance. Salt enters with irrigation water and leaves with drainage, whose EC is
 * approximated by the soil-water EC at field capacity (≈ 2·ECe). Returns the new ECe (dS/m).
 */
export function updateSoilSalinity(
  ece: number,
  infiltratedIrrigation: number,
  ecw: number,
  deepPercolation: number,
  soil: SoilParams,
): number {
  const wSat = saturationWater(soil);
  const salt = ece * wSat + infiltratedIrrigation * ecw;
  // Drainage leaves with the concentration of the soil solution after the new water has mixed in.
  const eceMixed = salt / wSat;
  const removed = Math.min(salt, deepPercolation * 2 * eceMixed);
  return Math.max(0, (salt - removed) / wSat);
}

/** Salinity stress factor on ET (FAO-56 Eq. 89 without water stress). */
export function salinityStressCoefficient(ece: number, crop: CropParams): number {
  if (ece <= crop.eceThreshold) return 1;
  const ks = 1 - (crop.eceSlope / (crop.ky * 100)) * (ece - crop.eceThreshold);
  return Math.max(0, Math.min(1, ks));
}

/** Relative yield (%) expected from soil salinity alone (Maas–Hoffman). */
export function relativeYield(ece: number, crop: CropParams): number {
  if (ece <= crop.eceThreshold) return 100;
  return Math.max(0, 100 - crop.eceSlope * (ece - crop.eceThreshold));
}
