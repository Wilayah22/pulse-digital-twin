// Derived views over a SimulationResult, shared by the twin scene, basin panels and charts so they stay in sync.

import {
  APPLICATION_EFFICIENCY,
  BASINS,
  classifyHealth,
  depthToVolume,
  type BasinHealth,
  type BasinId,
  type PriorityLevel,
  type SimulationResult,
  type StrategyResult,
} from "../engine";

export interface BasinDayView {
  id: BasinId;
  name: string;
  area: number;
  taw: number;
  raw: number;
  day: number;
  moistureBefore: number;
  moistureAfter: number;
  depletionBefore: number;
  /** Health at the moment water arrives (before irrigation). */
  health: BasinHealth;
  /** Health after the day's irrigation and ET. */
  healthEnd: BasinHealth;
  priority: PriorityLevel;
  priorityScore: number;
  irrigation: number; // m³ today
  request: number; // m³ requested today
  leaching: number; // m³ today
  eceStart: number;
  eceEnd: number;
  etc: number; // mm/day
  etcVolume: number; // m³/day gross requirement
  predictedDemand: number; // m³, rest of the period incl. today
  totalAllocated: number; // m³ over the period
  lastIrrigation: string;
  stressDays: number;
}

export function strategyOf(result: SimulationResult, strategy: "pulse" | "traditional"): StrategyResult {
  return strategy === "pulse" ? result.pulse : result.traditional;
}

export function basinDayViews(result: SimulationResult, strategy: "pulse" | "traditional", day: number): BasinDayView[] {
  const s = strategyOf(result, strategy);
  const idx = Math.max(0, Math.min(day - 1, s.basins[0].days.length - 1));
  return s.basins.map((b) => {
    const d = b.days[idx];
    const cfg = BASINS.find((x) => x.id === b.id);
    const previous = b.days.slice(0, idx).filter((x) => x.irrigationVolume > 1e-6);
    const lastIrrigation = previous.length
      ? `اليوم ${previous[previous.length - 1].day}`
      : `قبل ${(cfg?.lastIrrigationDaysAgo ?? 0) + idx} ${(cfg?.lastIrrigationDaysAgo ?? 0) + idx > 2 ? "أيام" : "يوم"}`;
    const predictedDemand = b.days
      .slice(idx)
      .reduce((a, x) => a + depthToVolume(Math.max(0, x.etc - x.effectiveRain), b.area) / APPLICATION_EFFICIENCY, 0);
    return {
      id: b.id,
      name: b.name,
      area: b.area,
      taw: b.taw,
      raw: b.raw,
      day: d.day,
      moistureBefore: d.moistureBefore,
      moistureAfter: d.moistureAfter,
      depletionBefore: d.depletionBefore,
      health: classifyHealth(d.depletionBefore, b.taw, b.raw),
      healthEnd: d.health,
      priority: d.priority,
      priorityScore: d.priorityScore,
      irrigation: d.irrigationVolume,
      request: d.requestVolume,
      leaching: d.leachingVolume,
      eceStart: idx === 0 ? b.initial.ece : b.days[idx - 1].eceEnd,
      eceEnd: d.eceEnd,
      etc: d.etc,
      etcVolume: depthToVolume(d.etc, b.area) / APPLICATION_EFFICIENCY,
      predictedDemand,
      totalAllocated: b.totalIrrigation,
      lastIrrigation,
      stressDays: b.stressDays,
    };
  });
}

export function reservoirOnDay(result: SimulationResult, strategy: "pulse" | "traditional", day: number) {
  const s = strategyOf(result, strategy);
  const i = Math.max(0, Math.min(day - 1, s.dailyStock.length - 1));
  const capacity = Math.max(1, ...result.pulse.dailyStock, ...result.traditional.dailyStock) * 1.15;
  return { stock: s.dailyStock[i], used: s.dailyUse[i], capacity, level: s.dailyStock[i] / capacity };
}
