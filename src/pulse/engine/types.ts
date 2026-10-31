// Pulse simulation engine: shared types.
// Units: depths in mm, volumes in m³, areas in m², salinity in dS/m, wind in m/s at 2 m.

import type { Pulse, ScheduledPulse } from "./greenAmpt";

export type BasinId = "A" | "B" | "C";

/** Interface language for generated text (recommendations). */
export type Lang = "ar" | "en";

export interface SoilParams {
  /** Volumetric water content at field capacity (m³/m³). */
  thetaFC: number;
  /** Volumetric water content at wilting point (m³/m³). */
  thetaWP: number;
  /** Effective root-zone depth (m). */
  rootDepth: number;
  /** FAO-56 depletion fraction p (RAW = p · TAW). */
  depletionFraction: number;
}

export interface CropParams {
  /** Crop coefficient. 0.95 is a provisional experimental default for mature date palm. */
  kc: number;
  /** Soil salinity (ECe) above which yield starts to decline (dS/m). Crop-specific, not a water threshold. */
  eceThreshold: number;
  /** Yield decline per dS/m above the threshold (%). */
  eceSlope: number;
  /** Yield response factor (FAO-56 Eq. 89). */
  ky: number;
}

export interface BasinConfig {
  id: BasinId;
  name: string;
  /** Irrigated basin area (m²). */
  area: number;
  /** Root-zone depletion at simulation start (mm). */
  initialDepletion: number;
  /** Soil salinity at simulation start, saturated paste extract (dS/m). */
  initialEce: number;
  /** Days since this basin was last irrigated before the simulation starts. */
  lastIrrigationDaysAgo: number;
  /** Saturated hydraulic conductivity Ks (mm/h), as inferred by the hydraulic step test. */
  ksMmH: number;
}

export type DustLevel = "none" | "moderate" | "severe";
export type WeatherMode = "live" | "custom";

/** One day of weather that drives the water balance. */
export interface WeatherDay {
  date: string; // ISO yyyy-mm-dd
  tMax: number; // °C
  tMin: number; // °C
  wind: number; // m/s at 2 m
  rain: number; // mm
  et0: number; // mm/day (FAO-56 Penman-Monteith)
  weatherCode: number; // WMO code, used for icons only
}

export type WeatherSource = "open-meteo" | "custom" | "demo";

export interface WeatherSeries {
  source: WeatherSource;
  days: WeatherDay[];
}

export interface CustomWeather {
  temperature: number; // daily max °C
  wind: number; // m/s at 2 m
  rainfall: number; // mm over the 7-day period
  dust: DustLevel;
}

export interface SimulationInputs {
  /** Total water volume delivered to the shared reservoir over the period (m³). */
  availableWater: number;
  /** Irrigation water salinity ECw (dS/m). */
  ecw: number;
  /** Delay of the first irrigation turn (hours). */
  delayHours: number;
  /** Day (1-based) from which water delivery stops. 0 = no outage. */
  outageFromDay: number;
  weatherMode: WeatherMode;
  customWeather: CustomWeather;
  kc: number;
}

export type PriorityLevel = "critical" | "medium" | "low";
export type BasinHealth = "healthy" | "moderate" | "critical";

export interface BasinDayState {
  day: number; // 1..N
  /** Depletion before irrigation (mm). */
  depletionBefore: number;
  /** Depletion after irrigation, before the day's ET (mm). */
  depletionAfterIrrigation: number;
  /** Depletion at end of day (mm). */
  depletionEnd: number;
  /** Available-water content as % of TAW before / after irrigation and at end of day. */
  moistureBefore: number;
  moistureAfter: number;
  moistureEnd: number;
  etc: number; // potential ETc (mm)
  etcAdj: number; // actual ET after water and salt stress (mm)
  ks: number; // combined stress coefficient
  irrigationVolume: number; // m³ delivered to the basin
  irrigationDepth: number; // mm infiltrated
  leachingVolume: number; // m³ of the delivered volume intended for leaching
  effectiveRain: number; // mm
  deepPercolation: number; // mm
  eceEnd: number; // dS/m
  priorityScore: number;
  priority: PriorityLevel;
  requestVolume: number; // m³ requested by the allocator (Pulse only, 0 for traditional)
  health: BasinHealth;
  /** Irrigation pulses applied this day (empty when the valve stays closed). */
  pulses: Pulse[];
  /** Deepest wetting front reached by an irrigation pulse (mm); leaching pulses excluded. */
  wettingFrontMm: number;
}

export interface BasinResult {
  id: BasinId;
  name: string;
  area: number;
  taw: number;
  raw: number;
  initial: {
    depletion: number;
    moisture: number;
    ece: number;
    health: BasinHealth;
    priorityScore: number;
    priority: PriorityLevel;
  };
  days: BasinDayState[];
  totalIrrigation: number; // m³
  totalLeaching: number; // m³
  totalDeepPercolation: number; // mm
  stressDays: number; // days with Ks < 1 due to water stress
  lastIrrigationDay: number | null; // last simulated day with irrigation
}

export interface StrategyResult {
  strategy: "pulse" | "traditional";
  basins: BasinResult[];
  dailyUse: number[]; // m³ per day, all basins
  dailyStock: number[]; // m³ in the reservoir before each day's allocation
  /** Valve schedule on the shared source for each day (minutes from the start of the turn). */
  schedules: ScheduledPulse[][];
  totalUsed: number;
  reservoirEnd: number; // m³ left unused
  avgMoisture: number; // % of TAW, averaged over basins and days (end of day)
  avgEce: number; // final ECe averaged over basins
  stressDays: number;
}

export interface DayInfo {
  day: number;
  date: string;
  delivered: number; // m³ arriving at the reservoir
  et0: number;
}

export interface Recommendation {
  id: string;
  kind: "priority" | "defer" | "limit" | "schedule" | "rain" | "leaching" | "no-leaching" | "delay" | "outage" | "saving";
  basin?: BasinId;
  severity: "info" | "warning" | "critical" | "success";
  action: string;
  reason: string;
  allocation?: string;
  impact?: string;
}

export interface SimulationResult {
  inputs: SimulationInputs;
  weather: WeatherSeries;
  timeline: DayInfo[];
  pulse: StrategyResult;
  traditional: StrategyResult;
  leachingRequirement: number; // fraction
  /** Water actually delivered over the period after outages (m³). */
  totalDelivered: number;
  recommendations: Recommendation[];
}
