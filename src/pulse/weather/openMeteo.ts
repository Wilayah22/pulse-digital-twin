// Open-Meteo client for Al-Ahsa. Daily ET0 comes straight from the API's FAO-56 variable.

import { SIMULATION_DAYS, SITE, sanitizeWeatherDay, windAt2m, type WeatherDay, type WeatherSeries } from "../engine";

export interface LiveWeather {
  series: WeatherSeries;
  current: { temperature: number; weatherCode: number; wind: number } | null;
  fetchedAt: number;
}

const CACHE_KEY = "pulse.openMeteo.v1";
const CACHE_TTL_MS = 30 * 60 * 1000;

export function buildForecastUrl(): string {
  const params = new URLSearchParams({
    latitude: String(SITE.latitude),
    longitude: String(SITE.longitude),
    daily: [
      "weather_code",
      "temperature_2m_max",
      "temperature_2m_min",
      "precipitation_sum",
      "wind_speed_10m_max",
      "et0_fao_evapotranspiration",
    ].join(","),
    current: "temperature_2m,weather_code,wind_speed_10m",
    timezone: SITE.timezone,
    forecast_days: String(SIMULATION_DAYS),
    wind_speed_unit: "ms",
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

interface OpenMeteoResponse {
  daily?: {
    time?: string[];
    weather_code?: (number | null)[];
    temperature_2m_max?: (number | null)[];
    temperature_2m_min?: (number | null)[];
    precipitation_sum?: (number | null)[];
    wind_speed_10m_max?: (number | null)[];
    et0_fao_evapotranspiration?: (number | null)[];
  };
  current?: { temperature_2m?: number; weather_code?: number; wind_speed_10m?: number };
}

/** Parse and validate an Open-Meteo response. Throws if the daily block is unusable. */
export function parseForecast(json: OpenMeteoResponse): Omit<LiveWeather, "fetchedAt"> {
  const d = json.daily;
  if (!d?.time || d.time.length < SIMULATION_DAYS || !d.et0_fao_evapotranspiration) {
    throw new Error("Open-Meteo response is missing daily data");
  }
  const days: WeatherDay[] = d.time.slice(0, SIMULATION_DAYS).map((date, i) => {
    const et0 = d.et0_fao_evapotranspiration?.[i];
    if (et0 == null) throw new Error(`Open-Meteo has no ET0 for ${date}`);
    const wind10 = d.wind_speed_10m_max?.[i];
    return sanitizeWeatherDay(
      {
        date,
        tMax: d.temperature_2m_max?.[i] ?? undefined,
        tMin: d.temperature_2m_min?.[i] ?? undefined,
        rain: d.precipitation_sum?.[i] ?? 0,
        // Daily maximum at 10 m, scaled to 2 m for display. ET0 itself is taken from the API.
        wind: wind10 == null ? undefined : windAt2m(wind10, 10),
        et0,
        weatherCode: d.weather_code?.[i] ?? 0,
      },
      date,
    );
  });
  const c = json.current;
  return {
    series: { source: "open-meteo", days },
    current:
      c && typeof c.temperature_2m === "number"
        ? { temperature: c.temperature_2m, weatherCode: c.weather_code ?? 0, wind: c.wind_speed_10m ?? 0 }
        : null,
  };
}

function readCache(): LiveWeather | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as LiveWeather;
    return Date.now() - v.fetchedAt < CACHE_TTL_MS ? v : null;
  } catch {
    return null;
  }
}

function writeCache(v: LiveWeather) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(v));
  } catch {
    // Storage may be unavailable (private mode); the in-memory promise still dedupes requests.
  }
}

let inflight: Promise<LiveWeather> | null = null;

/** Fetch the 7-day forecast once per 30 minutes per tab. Concurrent callers share one request. */
export function fetchAlAhsaForecast({ force = false }: { force?: boolean } = {}): Promise<LiveWeather> {
  if (!force) {
    const cached = readCache();
    if (cached) return Promise.resolve(cached);
    if (inflight) return inflight;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  inflight = fetch(buildForecastUrl(), { signal: controller.signal })
    .then(async (res) => {
      if (!res.ok) throw new Error(`Open-Meteo HTTP ${res.status}`);
      const parsed = parseForecast((await res.json()) as OpenMeteoResponse);
      const value = { ...parsed, fetchedAt: Date.now() };
      writeCache(value);
      return value;
    })
    .finally(() => {
      clearTimeout(timeout);
      inflight = null;
    });
  return inflight;
}
