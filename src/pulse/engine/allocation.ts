// Water allocation: the Pulse priority-based allocator and the fixed-share traditional baseline.

import { APPLICATION_EFFICIENCY, IRRIGATION_TRIGGER } from "./constants";
import { depthToVolume } from "./waterBalance";
import type { BasinId, CropParams, PriorityLevel } from "./types";

export interface BasinSnapshot {
  id: BasinId;
  area: number; // m²
  depletion: number; // mm, expected at the time water arrives (includes any delay)
  ece: number; // dS/m
  etc: number; // mm/day, today's potential crop ET
  effectiveRain: number; // mm expected today
  taw: number;
  raw: number;
  /** Root-zone water at saturation (mm), used by the salt balance. */
  wSat: number;
  /** Irrigation water salinity (dS/m). */
  ecw: number;
}

export const PRIORITY_WEIGHTS = { depletion: 0.65, demand: 0.15, salinity: 0.2 } as const;
/** ETc (mm/day) treated as maximum demand when normalising the demand term. */
const DEMAND_REFERENCE = 10;

/**
 * Priority score in [0, 1]. Combines root-zone depletion (driest first), crop water demand and
 * soil salinity above the crop threshold.
 */
export function priorityScore(b: BasinSnapshot, crop: CropParams): number {
  const depletionTerm = Math.min(1, b.depletion / (0.75 * b.taw));
  const demandTerm = Math.min(1, b.etc / DEMAND_REFERENCE);
  const salinityTerm = Math.min(1, Math.max(0, b.ece - crop.eceThreshold) / crop.eceThreshold);
  return (
    PRIORITY_WEIGHTS.depletion * depletionTerm +
    PRIORITY_WEIGHTS.demand * demandTerm +
    PRIORITY_WEIGHTS.salinity * salinityTerm
  );
}

export function priorityLevel(score: number): PriorityLevel {
  if (score >= 0.6) return "critical";
  if (score >= 0.4) return "medium";
  return "low";
}

export interface BasinRequest {
  id: BasinId;
  score: number;
  /** Gross volume to refill the root zone to field capacity (m³). 0 when irrigation is not yet due. */
  base: number;
  /** Extra gross volume for salt leaching (m³). */
  leaching: number;
}

/** Gross volume (m³) needed to deliver a net depth (mm) over an area. */
export function grossVolume(netDepth: number, area: number, efficiency = APPLICATION_EFFICIENCY): number {
  return depthToVolume(Math.max(0, netDepth), area) / efficiency;
}

/**
 * Leaching depth (mm) for one irrigation of `net` mm. Takes the larger of the FAO-29 leaching requirement
 * and the drainage needed to stop this irrigation from raising ECe under the root-zone salt balance.
 */
export function leachingDepth(net: number, ece: number, ecw: number, wSat: number, lr: number): number {
  if (net <= 0 || lr <= 0) return 0;
  const fromLr = (net * lr) / (1 - lr);
  const eceMixed = (ece * wSat + net * ecw) / wSat;
  const maintenance = eceMixed > 0 ? (net * ecw) / (2 * eceMixed) : 0;
  return Math.max(fromLr, maintenance);
}

/**
 * What each basin asks for today. Irrigation is due once depletion passes the trigger fraction of RAW;
 * the request refills the root zone to field capacity net of expected rain. Leaching water is added
 * only when soil ECe exceeds the crop threshold.
 */
export function basinRequest(b: BasinSnapshot, crop: CropParams, lr: number): BasinRequest {
  const score = priorityScore(b, crop);
  const due = b.depletion > IRRIGATION_TRIGGER * b.raw;
  const net = due ? Math.max(0, b.depletion - b.effectiveRain) : 0;
  const base = grossVolume(net, b.area);
  const needsLeaching = due && b.ece > crop.eceThreshold;
  const leaching = needsLeaching ? grossVolume(leachingDepth(net, b.ece, b.ecw, b.wSat, lr), b.area) : 0;
  return { id: b.id, score, base, leaching };
}

/**
 * Split a budget across requests in proportion to priority score, never giving a basin more than it
 * asked for. Unused share is redistributed until the budget or the requests are exhausted.
 */
export function weightedWaterFilling(
  requests: { id: BasinId; amount: number; weight: number }[],
  budget: number,
): Record<BasinId, number> {
  const out = { A: 0, B: 0, C: 0 } as Record<BasinId, number>;
  let remaining = Math.max(0, budget);
  let active = requests.filter((r) => r.amount > 1e-9);
  for (let guard = 0; guard < 10 && remaining > 1e-9 && active.length > 0; guard++) {
    const totalWeight = active.reduce((s, r) => s + Math.max(r.weight, 0.01), 0);
    let given = 0;
    for (const r of active) {
      const share = (remaining * Math.max(r.weight, 0.01)) / totalWeight;
      const give = Math.min(share, r.amount - out[r.id]);
      out[r.id] += give;
      given += give;
    }
    remaining -= given;
    active = active.filter((r) => r.amount - out[r.id] > 1e-9);
    if (given <= 1e-9) break;
  }
  return out;
}

export interface PulseDecision {
  allocations: Record<BasinId, number>;
  leaching: Record<BasinId, number>;
  requests: BasinRequest[];
  /** True when supply could not cover all base requests plus the forecast need. */
  rationed: boolean;
  /** True when leaching was justified by salinity but withheld for lack of water. */
  leachingWithheld: boolean;
  /** Basins whose leaching need is covered by forecast rain draining through the root zone. */
  leachingByRain: BasinId[];
  /** Forecast rain drainage per basin (mm). */
  rainDrainage: Record<BasinId, number>;
  /** Basins whose justified leaching was withheld, and why: the period's supply or today's reservoir stock. */
  withheldBasins: BasinId[];
  withheldCause: "supply" | "stock" | null;
}

export interface RainForecast {
  etc: number[]; // mm/day for every simulated day
  effectiveRain: number[]; // mm/day for every simulated day
  today: number; // 0-based index of the current day
}

/**
 * Rain that will drain below the root zone over the coming days (mm), starting from the basin's
 * depletion after today's irrigation. Depletion builds with ETc until each rain day; rain beyond it
 * percolates and, carrying no salt, leaches the root zone.
 */
export function forecastRainDrainage(etc: number[], effectiveRain: number[], today: number, startDepletion = 0): number {
  let depletion = Math.max(0, startDepletion);
  let drainage = 0;
  for (let f = today + 1; f < etc.length; f++) {
    depletion += etc[f - 1];
    drainage += Math.max(0, effectiveRain[f] - depletion);
    depletion = Math.max(0, depletion - effectiveRain[f]);
  }
  return drainage;
}

/**
 * Pulse daily decision.
 * @param stock water in the shared reservoir now (m³)
 * @param expectedFuture deliveries Pulse expects for the rest of the period (m³)
 * @param futureNeed forecast gross need for the rest of the period (m³)
 */
export function allocatePulse(
  basins: BasinSnapshot[],
  crop: CropParams,
  lr: number,
  stock: number,
  expectedFuture: number,
  futureNeed: number,
  allowLeaching = true,
  /** Weather forecast used to defer leaching that rain will do anyway. */
  rain?: RainForecast,
): PulseDecision {
  const requests = basins.map((b) => basinRequest(b, crop, lr));
  const baseNeed = requests.reduce((s, r) => s + r.base, 0);
  const totalRemaining = stock + expectedFuture;

  const sufficient = totalRemaining >= baseNeed + futureNeed;
  const baseBudget = sufficient
    ? Math.min(stock, baseNeed)
    : Math.min(stock, baseNeed > 0 ? (totalRemaining * baseNeed) / (baseNeed + futureNeed) : 0);

  const allocations = weightedWaterFilling(
    requests.map((r) => ({ id: r.id, amount: r.base, weight: r.score })),
    baseBudget,
  );

  // Leaching that forecast rain will do for free is deferred instead of paid for from the reservoir.
  // Each basin is judged from its own depletion after today's base allocation.
  const leachingByRain: BasinId[] = [];
  const rainDrainage = { A: 0, B: 0, C: 0 } as Record<BasinId, number>;
  if (rain) {
    for (const r of requests) {
      const b = basins.find((x) => x.id === r.id);
      if (!b || r.leaching <= 0) continue;
      const infiltrated = (allocations[r.id] * APPLICATION_EFFICIENCY * 1000) / b.area;
      const after = Math.max(0, b.depletion - infiltrated - b.effectiveRain);
      rainDrainage[r.id] = forecastRainDrainage(rain.etc, rain.effectiveRain, rain.today, after);
      const depth = (r.leaching * APPLICATION_EFFICIENCY * 1000) / b.area;
      if (rainDrainage[r.id] >= depth) {
        leachingByRain.push(r.id);
        r.leaching = 0;
      }
    }
  }
  const leachNeed = requests.reduce((s, r) => s + r.leaching, 0);

  const leaching = { A: 0, B: 0, C: 0 } as Record<BasinId, number>;
  const surplus = totalRemaining - baseNeed - futureNeed;
  const canLeach = allowLeaching && sufficient && leachNeed > 0 && surplus >= leachNeed && stock - baseBudget >= leachNeed;
  if (canLeach) {
    for (const r of requests) {
      leaching[r.id] = r.leaching;
      allocations[r.id] += r.leaching;
    }
  }

  return {
    allocations,
    leaching,
    requests,
    rationed: !sufficient && baseNeed > 0,
    leachingWithheld: leachNeed > 0 && !canLeach,
    leachingByRain,
    rainDrainage,
    withheldBasins: leachNeed > 0 && !canLeach ? requests.filter((r) => r.leaching > 0).map((r) => r.id) : [],
    withheldCause: leachNeed > 0 && !canLeach && allowLeaching ? (sufficient && surplus >= leachNeed ? "stock" : "supply") : null,
  };
}

/** Traditional rotation: the day's delivered water is split by fixed area shares, regardless of need. */
export function allocateTraditional(basins: { id: BasinId; area: number }[], delivered: number): Record<BasinId, number> {
  const totalArea = basins.reduce((s, b) => s + b.area, 0);
  const out = { A: 0, B: 0, C: 0 } as Record<BasinId, number>;
  for (const b of basins) out[b.id] = totalArea > 0 ? (delivered * b.area) / totalArea : 0;
  return out;
}
