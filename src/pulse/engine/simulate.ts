// Runs Pulse and the traditional baseline side by side under identical weather and water supply.

import { allocatePulse, allocateTraditional, grossVolume, priorityLevel, priorityScore, type BasinSnapshot } from "./allocation";
import { APPLICATION_EFFICIENCY, BASINS, CROP, SIMULATION_DAYS, SOIL } from "./constants";
import { cropET } from "./et0";
import { buildRecommendations } from "./recommendations";
import { leachingRequirement, salinityStressCoefficient, saturationWater, updateSoilSalinity } from "./salinity";
import { sanitizeInputs, sanitizeWeatherDay } from "./validate";
import {
  applyEvapotranspiration,
  applyWaterInputs,
  classifyHealth,
  effectiveRainfall,
  moisturePercent,
  readilyAvailableWater,
  totalAvailableWater,
  volumeToDepth,
  waterStressCoefficient,
} from "./waterBalance";
import type {
  BasinConfig,
  BasinDayState,
  BasinId,
  BasinResult,
  CropParams,
  DayInfo,
  SimulationInputs,
  SimulationResult,
  SoilParams,
  StrategyResult,
  WeatherSeries,
} from "./types";

export interface SimulationConfig {
  basins: BasinConfig[];
  soil: SoilParams;
  crop: CropParams;
  days: number;
}

export const DEFAULT_CONFIG: SimulationConfig = { basins: BASINS, soil: SOIL, crop: CROP, days: SIMULATION_DAYS };

/**
 * Daily delivery schedule into the shared reservoir. The period's water arrives in equal daily turns.
 * A delayed first turn shifts that share of day 1 into day 2. An outage stops delivery from that day on.
 * `planned` is what the operator expects before any outage happens.
 */
export function deliverySchedule(inputs: SimulationInputs, days: number): { planned: number[]; actual: number[] } {
  const daily = inputs.availableWater / days;
  const delayFrac = Math.min(1, inputs.delayHours / 24);
  const planned = Array.from({ length: days }, () => daily);
  if (days > 1 && delayFrac > 0) {
    planned[0] = daily * (1 - delayFrac);
    planned[1] += daily * delayFrac;
  }
  const actual = planned.map((v, i) => (inputs.outageFromDay > 0 && i + 1 >= inputs.outageFromDay ? 0 : v));
  return { planned, actual };
}

interface BasinState {
  cfg: BasinConfig;
  depletion: number;
  ece: number;
  days: BasinDayState[];
}

function runStrategy(
  strategy: "pulse" | "traditional",
  inputs: SimulationInputs,
  weather: WeatherSeries,
  schedule: { planned: number[]; actual: number[] },
  config: SimulationConfig,
  lr: number,
  allowLeaching = true,
): { result: StrategyResult; flags: PulseFlags } {
  const { soil, days } = config;
  const crop = { ...config.crop, kc: inputs.kc };
  const taw = totalAvailableWater(soil);
  const raw = readilyAvailableWater(soil);
  const delayFrac = Math.min(1, inputs.delayHours / 24);
  const wSat = saturationWater(soil);

  const states: BasinState[] = config.basins.map((cfg) => ({
    cfg,
    depletion: Math.min(taw, Math.max(0, cfg.initialDepletion)),
    ece: Math.max(0, cfg.initialEce),
    days: [],
  }));

  let stock = 0;
  let outageDetected = false;
  const dailyUse: number[] = [];
  const dailyStock: number[] = [];
  const flags = {
    rationedDays: [] as number[],
    leachingWithheldDays: [] as number[],
    leachingDays: [] as number[],
    leachingRainDays: [] as number[],
    rainLeachBasins: [] as BasinId[],
    rainDrainage: 0,
    withheldBasins: [] as BasinId[],
    withheldBySupply: false,
  };
  const etcSeries = weather.days.map((w) => cropET(w.et0, crop.kc));
  const peSeries = weather.days.map((w) => effectiveRainfall(w.rain));

  for (let d = 0; d < days; d++) {
    const w = weather.days[d];
    const etc = cropET(w.et0, crop.kc);
    const pe = effectiveRainfall(w.rain);
    const preFrac = d === 0 ? delayFrac : 0;

    // ET that happens while waiting for a delayed turn.
    const pre = states.map((s) => {
      const ks = waterStressCoefficient(s.depletion, taw, raw) * salinityStressCoefficient(s.ece, crop);
      const et = ks * etc * preFrac;
      return { et, depletion: applyEvapotranspiration(s.depletion, et, taw) };
    });

    const delivered = schedule.actual[d];
    stock += delivered;
    if (delivered === 0 && schedule.planned[d] > 0) outageDetected = true;

    const snapshots: BasinSnapshot[] = states.map((s, i) => ({
      id: s.cfg.id,
      area: s.cfg.area,
      depletion: pre[i].depletion,
      ece: s.ece,
      etc,
      effectiveRain: pe,
      taw,
      raw,
      wSat,
      ecw: inputs.ecw,
    }));
    dailyStock.push(stock);

    let alloc: Record<BasinId, number>;
    let leach: Record<BasinId, number> = { A: 0, B: 0, C: 0 };
    let requests: Record<BasinId, number> = { A: 0, B: 0, C: 0 };

    if (strategy === "pulse") {
      const expectedFuture = outageDetected ? 0 : schedule.planned.slice(d + 1).reduce((a, b) => a + b, 0);
      let futureNeed = 0;
      for (let f = d + 1; f < days; f++) {
        const etcF = cropET(weather.days[f].et0, crop.kc);
        const peF = effectiveRainfall(weather.days[f].rain);
        for (const s of states) futureNeed += grossVolume(Math.max(0, etcF - peF), s.cfg.area);
      }
      const decision = allocatePulse(snapshots, crop, lr, stock, expectedFuture, futureNeed, allowLeaching, {
        etc: etcSeries,
        effectiveRain: peSeries,
        today: d,
      });
      if (decision.leachingByRain.length > 0) {
        flags.leachingRainDays.push(d + 1);
        for (const id of decision.leachingByRain) {
          if (!flags.rainLeachBasins.includes(id)) flags.rainLeachBasins.push(id);
          flags.rainDrainage = Math.max(flags.rainDrainage, decision.rainDrainage[id]);
        }
      }
      alloc = decision.allocations;
      leach = decision.leaching;
      for (const r of decision.requests) requests[r.id] = r.base + r.leaching;
      if (decision.rationed) flags.rationedDays.push(d + 1);
      if (decision.leachingWithheld) {
        flags.leachingWithheldDays.push(d + 1);
        for (const id of decision.withheldBasins) if (!flags.withheldBasins.includes(id)) flags.withheldBasins.push(id);
        if (decision.withheldCause === "supply") flags.withheldBySupply = true;
      }
      if (Object.values(leach).some((v) => v > 0)) flags.leachingDays.push(d + 1);
    } else {
      alloc = allocateTraditional(states.map((s) => ({ id: s.cfg.id, area: s.cfg.area })), stock);
      requests = { ...alloc };
    }

    const used = Object.values(alloc).reduce((a, b) => a + b, 0);
    stock = Math.max(0, stock - used);
    dailyUse.push(used);

    states.forEach((s, i) => {
      const id = s.cfg.id;
      const snap = snapshots[i];
      const score = priorityScore(snap, crop);
      const volume = alloc[id];
      const infiltrated = volumeToDepth(volume * APPLICATION_EFFICIENCY, s.cfg.area);
      const before = pre[i].depletion;
      const { depletion: afterIrr, deepPercolation } = applyWaterInputs(before, infiltrated + pe);
      const ece = updateSoilSalinity(s.ece, infiltrated, inputs.ecw, deepPercolation, soil);
      const ks = waterStressCoefficient(afterIrr, taw, raw) * salinityStressCoefficient(ece, crop);
      const etRest = ks * etc * (1 - preFrac);
      const end = applyEvapotranspiration(afterIrr, etRest, taw);

      s.days.push({
        day: d + 1,
        depletionBefore: before,
        depletionAfterIrrigation: afterIrr,
        depletionEnd: end,
        moistureBefore: moisturePercent(before, taw),
        moistureAfter: moisturePercent(afterIrr, taw),
        moistureEnd: moisturePercent(end, taw),
        etc,
        etcAdj: pre[i].et + etRest,
        ks,
        irrigationVolume: volume,
        irrigationDepth: infiltrated,
        leachingVolume: leach[id],
        effectiveRain: pe,
        deepPercolation,
        eceEnd: ece,
        priorityScore: score,
        priority: priorityLevel(score),
        requestVolume: requests[id],
        health: classifyHealth(end, taw, raw),
      });
      s.depletion = end;
      s.ece = ece;
    });
  }

  const basins: BasinResult[] = states.map((s) => {
    const initialSnap: BasinSnapshot = {
      id: s.cfg.id,
      area: s.cfg.area,
      depletion: s.cfg.initialDepletion,
      ece: s.cfg.initialEce,
      etc: cropET(weather.days[0].et0, crop.kc),
      effectiveRain: 0,
      taw,
      raw,
      wSat,
      ecw: inputs.ecw,
    };
    const initialScore = priorityScore(initialSnap, crop);
    const irrigated = s.days.filter((d) => d.irrigationVolume > 1e-6);
    return {
      id: s.cfg.id,
      name: s.cfg.name,
      area: s.cfg.area,
      taw,
      raw,
      initial: {
        depletion: s.cfg.initialDepletion,
        moisture: moisturePercent(s.cfg.initialDepletion, taw),
        ece: s.cfg.initialEce,
        health: classifyHealth(s.cfg.initialDepletion, taw, raw),
        priorityScore: initialScore,
        priority: priorityLevel(initialScore),
      },
      days: s.days,
      totalIrrigation: s.days.reduce((a, d) => a + d.irrigationVolume, 0),
      totalLeaching: s.days.reduce((a, d) => a + d.leachingVolume, 0),
      totalDeepPercolation: s.days.reduce((a, d) => a + d.deepPercolation, 0),
      stressDays: s.days.filter((d) => d.depletionEnd > raw).length,
      lastIrrigationDay: irrigated.length ? irrigated[irrigated.length - 1].day : null,
    };
  });

  const allDays = basins.flatMap((b) => b.days);
  const result: StrategyResult = {
    strategy,
    basins,
    dailyUse,
    dailyStock,
    totalUsed: dailyUse.reduce((a, b) => a + b, 0),
    reservoirEnd: stock,
    avgMoisture: allDays.reduce((a, d) => a + d.moistureEnd, 0) / Math.max(1, allDays.length),
    avgEce: basins.reduce((a, b) => a + b.days[b.days.length - 1].eceEnd, 0) / Math.max(1, basins.length),
    stressDays: basins.reduce((a, b) => a + b.stressDays, 0),
  };
  return { result, flags };
}

export interface PulseFlags {
  rationedDays: number[];
  leachingWithheldDays: number[];
  leachingDays: number[];
  /** Days on which leaching was deferred because forecast rain will leach the root zone. */
  leachingRainDays: number[];
  rainLeachBasins: BasinId[];
  /** Largest forecast rain drainage (mm) behind a deferral. */
  rainDrainage: number;
  withheldBasins: BasinId[];
  /** True if, on some day, the period's total supply (not just today's stock) ruled leaching out. */
  withheldBySupply: boolean;
}

/** Pure entry point: same inputs and weather always give the same result. */
export function runSimulation(
  rawInputs: Partial<SimulationInputs>,
  weather: WeatherSeries,
  config: SimulationConfig = DEFAULT_CONFIG,
): SimulationResult {
  const inputs = sanitizeInputs(rawInputs);
  const days = config.days;
  if (weather.days.length < days) {
    throw new Error(`Weather series has ${weather.days.length} days; ${days} required.`);
  }
  const cleanWeather: WeatherSeries = {
    source: weather.source,
    days: weather.days.slice(0, days).map((d, i) => sanitizeWeatherDay(d, `day-${i + 1}`)),
  };
  const schedule = deliverySchedule(inputs, days);
  const lr = leachingRequirement(inputs.ecw, config.crop.eceThreshold);

  const pulse = runStrategy("pulse", inputs, cleanWeather, schedule, config, lr);
  const traditional = runStrategy("traditional", inputs, cleanWeather, schedule, config, lr);
  // Counterfactual without leaching, so the recommendation can quote the effect of leaching itself.
  const noLeaching = pulse.flags.leachingDays.length
    ? runStrategy("pulse", inputs, cleanWeather, schedule, config, lr, false).result
    : pulse.result;

  const timeline: DayInfo[] = cleanWeather.days.map((w, i) => ({
    day: i + 1,
    date: w.date,
    delivered: schedule.actual[i],
    et0: w.et0,
  }));

  const partial = {
    inputs,
    weather: cleanWeather,
    timeline,
    pulse: pulse.result,
    traditional: traditional.result,
    leachingRequirement: lr,
    totalDelivered: schedule.actual.reduce((a, b) => a + b, 0),
  };
  return { ...partial, recommendations: buildRecommendations(partial, { ...pulse.flags, noLeaching }, { ...config.crop, kc: inputs.kc }) };
}

/** Water saving of Pulse relative to the traditional baseline (%). Negative = Pulse used more. */
export function waterSavingPercent(result: Pick<SimulationResult, "pulse" | "traditional">): number {
  const t = result.traditional.totalUsed;
  return t > 0 ? (100 * (t - result.pulse.totalUsed)) / t : 0;
}

export function percentChange(value: number, reference: number): number {
  return reference !== 0 ? (100 * (value - reference)) / Math.abs(reference) : 0;
}
