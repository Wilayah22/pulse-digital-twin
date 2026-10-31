// Scales one simulated week to an oasis-wide annual estimate. Every assumption is explicit and editable,
// and the output is an estimate derived from the simulation, not measured data.

import type { SimulationResult } from "./types";

export interface ImpactAssumptions {
  /** Basins (palm plots) adopting Pulse. */
  basins: number;
  /** Weeks per year whose conditions resemble the simulated week. */
  weeksPerYear: number;
  /** Pumping energy per m³ of irrigation water (kWh/m³). */
  pumpingKwhPerM3: number;
  /** Electricity tariff (SAR/kWh). */
  tariffSarPerKwh: number;
  /** Household water use per person (litres/day). */
  litresPerPersonDay: number;
  /** Grid emission factor (kg CO₂ per kWh). */
  co2KgPerKwh: number;
}

export const DEFAULT_IMPACT: ImpactAssumptions = {
  basins: 10_000,
  weeksPerYear: 40,
  // Project paper: each m³ not pumped from a 150 m lift saves about 0.8 kWh.
  pumpingKwhPerM3: 0.8,
  tariffSarPerKwh: 0.18,
  litresPerPersonDay: 263,
  co2KgPerKwh: 0.57,
};

export interface ImpactEstimate {
  /** Water saved per basin over the simulated week (m³). */
  savedPerBasinWeek: number;
  /** Annual water saved across all basins (m³). */
  annualWaterM3: number;
  /** People whose household use the saving could cover for a year. */
  peopleEquivalent: number;
  /** Pumping energy avoided per year (kWh). */
  energyKwh: number;
  /** Pumping cost avoided per year (SAR). */
  costSar: number;
  /** CO₂ avoided per year (tonnes). */
  co2Tonnes: number;
  /** Stress-days avoided per basin over the simulated week. */
  stressDaysAvoidedPerBasin: number;
}

const nonNeg = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0);

export function estimateImpact(
  result: Pick<SimulationResult, "pulse" | "traditional">,
  a: ImpactAssumptions = DEFAULT_IMPACT,
): ImpactEstimate {
  const basinsInSim = Math.max(1, result.pulse.basins.length);
  const savedPerBasinWeek = nonNeg((result.traditional.totalUsed - result.pulse.totalUsed) / basinsInSim);
  const annualWaterM3 = savedPerBasinWeek * nonNeg(a.basins) * nonNeg(a.weeksPerYear);
  const perPersonYearM3 = (nonNeg(a.litresPerPersonDay) * 365) / 1000;
  const energyKwh = annualWaterM3 * nonNeg(a.pumpingKwhPerM3);
  return {
    savedPerBasinWeek,
    annualWaterM3,
    peopleEquivalent: perPersonYearM3 > 0 ? annualWaterM3 / perPersonYearM3 : 0,
    energyKwh,
    costSar: energyKwh * nonNeg(a.tariffSarPerKwh),
    co2Tonnes: (energyKwh * nonNeg(a.co2KgPerKwh)) / 1000,
    stressDaysAvoidedPerBasin: nonNeg((result.traditional.stressDays - result.pulse.stressDays) / basinsInSim),
  };
}

/** Coerce stored or user-entered values into valid assumptions; anything missing or invalid falls back to the default. */
export function sanitizeImpact(raw: unknown): ImpactAssumptions {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_IMPACT };
  for (const key of Object.keys(DEFAULT_IMPACT) as (keyof ImpactAssumptions)[]) {
    const v = typeof src[key] === "number" ? (src[key] as number) : Number.NaN;
    if (Number.isFinite(v) && v >= 0) out[key] = v;
  }
  return out;
}
