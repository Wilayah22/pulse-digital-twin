// Deterministic weather series for custom experimental scenarios and the offline demo.
// ET0 is computed with the FAO-56 Penman-Monteith equation from the scenario parameters.

import { SIMULATION_DAYS, SITE } from "./constants";
import {
  clearSkyRadiation,
  dayOfYear,
  extraterrestrialRadiation,
  penmanMonteithET0,
  saturationVapourPressure,
  solarRadiationFromTemperature,
} from "./et0";
import type { CustomWeather, DustLevel, WeatherDay, WeatherSeries, WeatherSource } from "./types";

// Fixed day-to-day variation so the same inputs always produce the same series.
const T_OFFSETS = [0, 0.8, -0.6, 1.2, 0.4, -0.8, 0.6];
const WIND_FACTORS = [1, 1.1, 0.9, 1.2, 1, 0.85, 1.05];
const RAIN_SHARES = [0, 0, 0.6, 0.4, 0, 0, 0];
const DIURNAL_RANGE = 14; // °C, arid inland site
const DEW_POINT_DEPRESSION = 3; // Tdew ≈ Tmin − 3 °C in arid climates (FAO-56, Annex 6)

/** Fraction of solar radiation reaching the ground under each dust scenario. */
export const DUST_RADIATION_FACTOR: Record<DustLevel, number> = { none: 1, moderate: 0.85, severe: 0.7 };

/** WMO code 7 = dust or sand raised by wind; used here only for icons. */
const WMO_DUST = 7;
const WMO_RAIN = 61;

export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function buildScenarioWeather(
  params: CustomWeather,
  startDate: string,
  source: Extract<WeatherSource, "custom" | "demo"> = "custom",
  days = SIMULATION_DAYS,
): WeatherSeries {
  const series: WeatherDay[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(startDate, i);
    const doy = dayOfYear(new Date(`${date}T00:00:00Z`));
    const tMax = params.temperature + T_OFFSETS[i % T_OFFSETS.length];
    const tMin = tMax - DIURNAL_RANGE;
    const wind = Math.max(0, params.wind * WIND_FACTORS[i % WIND_FACTORS.length]);
    const rain = params.rainfall * RAIN_SHARES[i % RAIN_SHARES.length];

    const ra = extraterrestrialRadiation(SITE.latitude, doy);
    const rso = clearSkyRadiation(ra, SITE.elevation);
    const cloudFactor = rain > 0 ? 0.6 : 1;
    const rs = Math.min(rso, solarRadiationFromTemperature(tMax, tMin, ra)) * DUST_RADIATION_FACTOR[params.dust] * cloudFactor;
    const ea = rain > 0 ? saturationVapourPressure(tMin) : saturationVapourPressure(tMin - DEW_POINT_DEPRESSION);

    const et0 = penmanMonteithET0({ tMax, tMin, u2: wind, rs, ea, latitude: SITE.latitude, elevation: SITE.elevation, doy });
    series.push({
      date,
      tMax: round(tMax, 1),
      tMin: round(tMin, 1),
      wind: round(wind, 1),
      rain: round(rain, 1),
      et0: round(et0, 2),
      weatherCode: rain > 0 ? WMO_RAIN : params.dust !== "none" ? WMO_DUST : 0,
    });
  }
  return { source, days: series };
}

/** Clearly-labelled fallback used when live data is unavailable. */
export const DEMO_WEATHER: CustomWeather = { temperature: 38, wind: 3, rainfall: 0, dust: "none" };

export function round(value: number, digits = 2): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
