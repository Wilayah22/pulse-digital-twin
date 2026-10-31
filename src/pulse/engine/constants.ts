import type { GreenAmptSoil } from "./greenAmpt";
import type { BasinConfig, CropParams, SimulationInputs, SoilParams } from "./types";

/** Al-Ahsa Oasis (Hofuf), approximate. */
export const SITE = {
  nameAr: "واحة الأحساء",
  nameShortEn: "Al-Ahsa Oasis",
  nameEn: "Al-Ahsa Oasis, Saudi Arabia",
  latitude: 25.38,
  longitude: 49.59,
  elevation: 150, // m
  timezone: "Asia/Riyadh",
} as const;

export const SIMULATION_DAYS = 7;

/** Sandy-loam oasis soil (typical of Al-Ahsa palm groves). TAW = 120 mm, RAW = 60 mm. */
export const SOIL: SoilParams = {
  thetaFC: 0.2,
  thetaWP: 0.08,
  rootDepth: 1.0,
  depletionFraction: 0.5,
};

/**
 * Date palm. Salinity tolerance after Ayers & Westcot (FAO-29): ECe threshold 4.0 dS/m,
 * 3.6 % yield decline per dS/m. Ky is a provisional value.
 */
export const CROP: CropParams = {
  kc: 0.95,
  eceThreshold: 4.0,
  eceSlope: 3.6,
  ky: 0.8,
};

/** Fraction of delivered water that infiltrates the basin (same hardware for both strategies). */
export const APPLICATION_EFFICIENCY = 0.9;

/** Pulse starts irrigating a basin once depletion exceeds this fraction of RAW. */
export const IRRIGATION_TRIGGER = 0.4;

/** Rain below this depth (mm/day) is treated as non-effective. */
export const MIN_EFFECTIVE_RAIN = 2;
export const EFFECTIVE_RAIN_FACTOR = 0.8;

/**
 * Green-Ampt parameters for sandy loam (Rawls, Brakensiek & Miller, 1983): Ks ≈ 10.9 mm/h, ψ ≈ 110 mm, θs ≈ 0.41.
 * All three basins share one soil, so the first-pulse infiltration speed reflects dryness alone, which is the
 * step-test indicator. In the field Ks is inferred per basin by the step test.
 */
export const GA_SOIL: Omit<GreenAmptSoil, "ksMmH"> = { psiMm: 110, thetaS: 0.41 };

/** Flow of the shared water source feeding one valve at a time (m³/h). Demonstration value. */
export const SOURCE_FLOW_M3H = 8;
/** Largest net depth per irrigation pulse (mm), keeping ponding shallow. */
export const MAX_PULSE_MM = 20;
/** Redistribution rest before the same basin receives its next pulse (min). */
export const PULSE_REST_MIN = 20;

export const BASINS: BasinConfig[] = [
  { id: "A", name: "الحوض A", area: 260, initialDepletion: 78, initialEce: 5.2, lastIrrigationDaysAgo: 4, ksMmH: 10.9 },
  { id: "B", name: "الحوض B", area: 240, initialDepletion: 45, initialEce: 4.4, lastIrrigationDaysAgo: 2, ksMmH: 10.9 },
  { id: "C", name: "الحوض C", area: 250, initialDepletion: 22, initialEce: 3.6, lastIrrigationDaysAgo: 1, ksMmH: 10.9 },
];

export const INPUT_LIMITS = {
  availableWater: { min: 20, max: 200, step: 1 },
  ecw: { min: 0.5, max: 8, step: 0.1 },
  delayHours: { min: 0, max: 12, step: 1 },
  outageFromDay: { min: 0, max: 7, step: 1 },
  temperature: { min: 20, max: 52, step: 1 },
  wind: { min: 0, max: 15, step: 0.5 },
  rainfall: { min: 0, max: 60, step: 1 },
  kc: { min: 0.5, max: 1.2, step: 0.01 },
} as const;

export const DEFAULT_INPUTS: SimulationInputs = {
  availableWater: 120,
  ecw: 2.5,
  delayHours: 0,
  outageFromDay: 0,
  weatherMode: "live",
  customWeather: { temperature: 42, wind: 3.5, rainfall: 0, dust: "none" },
  kc: CROP.kc,
};

export interface ScenarioPreset {
  id: string;
  name: string;
  description: string;
  nameEn: string;
  descriptionEn: string;
  apply: (current: SimulationInputs) => SimulationInputs;
}

// Presets start from default conditions (including the live weather source); only the crop Kc is kept.
const base = (current: SimulationInputs): SimulationInputs => ({
  ...DEFAULT_INPUTS,
  customWeather: { ...DEFAULT_INPUTS.customWeather },
  kc: current.kc,
});

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "normal",
    name: "الوضع الطبيعي",
    description: "120 م³ · ECw 2.5 · دون تأخير",
    nameEn: "Normal conditions",
    descriptionEn: "120 m³ · ECw 2.5 · no delay",
    apply: base,
  },
  {
    id: "water-cut",
    name: "انخفاض المياه بنسبة 40%",
    description: "72 م³ بدلاً من 120 م³",
    nameEn: "40% less water",
    descriptionEn: "72 m³ instead of 120 m³",
    apply: (c) => ({ ...base(c), availableWater: Math.round(DEFAULT_INPUTS.availableWater * 0.6) }),
  },
  {
    id: "high-salinity",
    name: "ارتفاع الملوحة",
    description: "مياه ري بملوحة ECw 6 dS/m",
    nameEn: "High salinity",
    descriptionEn: "Irrigation water at ECw 6 dS/m",
    apply: (c) => ({ ...base(c), ecw: 6 }),
  },
  {
    id: "delay",
    name: "تأخر المناوبة 6 ساعات",
    description: "تصل المناوبة الأولى متأخرة 6 ساعات",
    nameEn: "6-hour turn delay",
    descriptionEn: "The first water turn arrives 6 h late",
    apply: (c) => ({ ...base(c), delayHours: 6 }),
  },
  {
    id: "heatwave",
    name: "موجة حر ورياح",
    description: "48°C · رياح 7 م/ث · غبار متوسط",
    nameEn: "Heatwave and wind",
    descriptionEn: "48°C · wind 7 m/s · moderate dust",
    apply: (c) => ({
      ...base(c),
      weatherMode: "custom",
      customWeather: { temperature: 48, wind: 7, rainfall: 0, dust: "moderate" },
    }),
  },
  {
    id: "rain",
    name: "أمطار غزيرة",
    description: "40 مم خلال الفترة · 30°C",
    nameEn: "Heavy rain",
    descriptionEn: "40 mm over the period · 30°C",
    apply: (c) => ({
      ...base(c),
      weatherMode: "custom",
      customWeather: { temperature: 30, wind: 4, rainfall: 40, dust: "none" },
    }),
  },
  {
    id: "outage",
    name: "انقطاع مفاجئ للمياه",
    description: "يتوقف الإمداد من اليوم 4",
    nameEn: "Sudden water outage",
    descriptionEn: "Supply stops from day 4",
    apply: (c) => ({ ...base(c), outageFromDay: 4 }),
  },
];
