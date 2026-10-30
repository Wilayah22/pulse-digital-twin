// Maps the selected day's simulated conditions to visual intensities for the twin scene.
// Every effect is derived from simulation inputs/results, so the picture never contradicts the numbers.

import { CROP, type SimulationResult } from "../../engine";

export interface Atmosphere {
  /** 0 = mild (≤ 30 °C), 1 = extreme heat (≥ 48 °C). */
  heat: number;
  /** 0 = clear sky, 1 = overcast. */
  clouds: number;
  /** 0 = dry, 1 = heavy rain (≥ 10 mm/day). */
  rain: number;
  /** 0 = clear air, 1 = severe dust. */
  dust: number;
  /** 0 = calm, 1 = ≥ 10 m/s. */
  wind: number;
  /** Water stopped reaching the reservoir on this day. */
  outage: boolean;
  /** Water delivered to the reservoir on this day (m³). */
  inflow: number;
  /** Hours the first turn is delayed (shown on day 1 only). */
  delayHours: number;
  /** Salt-crust opacity per basin, from soil ECe at the start of the day. */
  salt: Record<string, number>;
}

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

/** Salt crust becomes visible as ECe approaches the crop threshold and saturates ~3 dS/m above it. */
export function saltCrust(ece: number): number {
  return clamp((ece - (CROP.eceThreshold - 0.5)) / 3.5, 0, 0.75);
}

export function atmosphereFor(result: SimulationResult, day: number, eceStart: Record<string, number>): Atmosphere {
  const i = Math.max(0, Math.min(day - 1, result.weather.days.length - 1));
  const w = result.weather.days[i];
  const code = w.weatherCode;

  const rain = w.rain >= 0.5 ? clamp(w.rain / 10, 0.3, 1) : 0;
  const codeClouds = code === 0 ? 0 : code <= 2 ? 0.35 : code === 3 ? 0.65 : code >= 45 ? 0.7 : 0;
  const clouds = Math.max(codeClouds, rain > 0 ? 0.6 + rain * 0.4 : 0);

  let dust = 0;
  if (result.weather.source === "custom") {
    const level = result.inputs.customWeather.dust;
    dust = level === "severe" ? 1 : level === "moderate" ? 0.55 : 0;
  } else if (code >= 4 && code <= 9) {
    dust = 0.6;
  }

  const delivered = result.timeline[i].delivered;
  const outage = result.inputs.outageFromDay > 0 && day >= result.inputs.outageFromDay;

  return {
    heat: clamp((w.tMax - 30) / 18),
    clouds,
    rain,
    dust,
    wind: clamp(w.wind / 10),
    outage,
    inflow: delivered,
    delayHours: day === 1 ? result.inputs.delayHours : 0,
    salt: Object.fromEntries(Object.entries(eceStart).map(([id, ece]) => [id, saltCrust(ece)])),
  };
}
