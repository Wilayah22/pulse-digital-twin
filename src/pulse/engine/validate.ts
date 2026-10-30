import { DEFAULT_INPUTS, INPUT_LIMITS } from "./constants";
import type { DustLevel, SimulationInputs, WeatherDay } from "./types";

function clamp(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const DUST: DustLevel[] = ["none", "moderate", "severe"];

/** Coerce any (possibly partial or malformed) input into a valid, in-range SimulationInputs. */
export function sanitizeInputs(raw: Partial<SimulationInputs> | undefined): SimulationInputs {
  const r = raw ?? {};
  const L = INPUT_LIMITS;
  const D = DEFAULT_INPUTS;
  const cw = r.customWeather ?? D.customWeather;
  return {
    availableWater: clamp(r.availableWater, L.availableWater.min, L.availableWater.max, D.availableWater),
    ecw: clamp(r.ecw, L.ecw.min, L.ecw.max, D.ecw),
    delayHours: Math.round(clamp(r.delayHours, L.delayHours.min, L.delayHours.max, D.delayHours)),
    outageFromDay: Math.round(clamp(r.outageFromDay, L.outageFromDay.min, L.outageFromDay.max, D.outageFromDay)),
    weatherMode: r.weatherMode === "custom" ? "custom" : "live",
    customWeather: {
      temperature: clamp(cw.temperature, L.temperature.min, L.temperature.max, D.customWeather.temperature),
      wind: clamp(cw.wind, L.wind.min, L.wind.max, D.customWeather.wind),
      rainfall: clamp(cw.rainfall, L.rainfall.min, L.rainfall.max, D.customWeather.rainfall),
      dust: DUST.includes(cw.dust) ? cw.dust : D.customWeather.dust,
    },
    kc: clamp(r.kc, L.kc.min, L.kc.max, D.kc),
  };
}

/** Replace missing or non-physical weather values so the water balance never sees NaN. */
export function sanitizeWeatherDay(d: Partial<WeatherDay>, fallbackDate: string): WeatherDay {
  const num = (v: unknown, min: number, max: number, fb: number) => clamp(v, min, max, fb);
  return {
    date: typeof d.date === "string" && d.date ? d.date : fallbackDate,
    tMax: num(d.tMax, -10, 60, 35),
    tMin: num(d.tMin, -15, 50, 22),
    wind: num(d.wind, 0, 40, 2),
    rain: num(d.rain, 0, 300, 0),
    et0: num(d.et0, 0, 20, 6),
    weatherCode: Math.round(num(d.weatherCode, 0, 99, 0)),
  };
}
