// Green-Ampt infiltration and pulse planning (hydraulic layer).
//
// Standard Green-Ampt (ponded surface):
//   infiltration rate      f = Ks · (1 + ψ·Δθ / F)       (equivalently Ks · (1 + ψ / Z), since F = Δθ · Z)
//   cumulative infiltration F − ψ·Δθ · ln(1 + F / (ψ·Δθ)) = Ks · t
//   wetting-front depth    Z = F / Δθ
// with Ks the saturated hydraulic conductivity, ψ the wetting-front suction head and Δθ = θs − θi.

export interface GreenAmptSoil {
  /** Saturated hydraulic conductivity (mm/h). Inferred per basin by the step test. */
  ksMmH: number;
  /** Wetting-front suction head ψ (mm). */
  psiMm: number;
  /** Volumetric water content at saturation θs. */
  thetaS: number;
}

/** Time (h) for cumulative infiltration F (mm) to soak in, solved explicitly from the Green-Ampt equation. */
export function timeToInfiltrate(fMm: number, soil: GreenAmptSoil, deltaTheta: number): number {
  if (fMm <= 0) return 0;
  const s = Math.max(1e-6, soil.psiMm * Math.max(1e-4, deltaTheta));
  return (fMm - s * Math.log(1 + fMm / s)) / soil.ksMmH;
}

/** Cumulative infiltration F (mm) after t hours of ponding, by Newton iteration on the Green-Ampt equation. */
export function cumulativeInfiltration(tH: number, soil: GreenAmptSoil, deltaTheta: number): number {
  if (tH <= 0) return 0;
  const s = Math.max(1e-6, soil.psiMm * Math.max(1e-4, deltaTheta));
  const target = soil.ksMmH * tH;
  // Start from the larger of the early-time (√) and late-time (linear) approximations.
  let f = Math.max(Math.sqrt(2 * soil.ksMmH * s * tH), target);
  for (let i = 0; i < 50; i++) {
    const g = f - s * Math.log(1 + f / s) - target;
    const dg = f / (s + f);
    const next = Math.max(1e-9, f - g / dg);
    if (Math.abs(next - f) < 1e-9) return next;
    f = next;
  }
  return f;
}

/** Infiltration rate (mm/h) once F mm has infiltrated. */
export function infiltrationRate(fMm: number, soil: GreenAmptSoil, deltaTheta: number): number {
  if (fMm <= 0) return Number.POSITIVE_INFINITY;
  return soil.ksMmH * (1 + (soil.psiMm * deltaTheta) / fMm);
}

/** Mean infiltration rate (mm/h) over a pulse of F mm, the quantity the ESP32 reads from the pressure drop. */
export function meanPulseRate(fMm: number, soil: GreenAmptSoil, deltaTheta: number): number {
  const t = timeToInfiltrate(fMm, soil, deltaTheta);
  return t > 0 ? fMm / t : soil.ksMmH;
}

/** Depth over which the step test reads the first-pulse infiltration speed (mm). */
export const STEP_TEST_MM = 5;

export interface Pulse {
  /** Net depth infiltrated by this pulse (mm). */
  depthMm: number;
  /** Gross volume delivered through the valve (m³). */
  volumeM3: number;
  /** Valve-open time at the shared source flow (min). */
  openMin: number;
  /** Time for the pulse to soak in (min), from Green-Ampt. */
  soakMin: number;
  /** Wetting-front depth reached by the pulse (mm). */
  frontMm: number;
  /** Mean infiltration rate during the pulse (mm/h). */
  rateMmH: number;
  /** Infiltration speed over the first 5 mm (mm/h): the step-test reading, high when the soil is dry. */
  startRateMmH: number;
  /** Δθ = θs − θi when the pulse starts. */
  deltaTheta: number;
  /** True for the dedicated salt-leaching pulse, which is meant to pass the root zone. */
  leaching: boolean;
}

export interface PulsePlanInput {
  /** Net depth to infiltrate for irrigation (mm), excluding leaching. */
  irrigationMm: number;
  /** Extra net depth for leaching (mm), applied as a final dedicated pulse. */
  leachingMm: number;
  /** Root-zone depletion before irrigating (mm). */
  depletionMm: number;
  area: number; // m²
  thetaFC: number;
  rootDepthMm: number;
  soil: GreenAmptSoil;
  /** Shared source flow (m³/h). */
  flowM3H: number;
  /** Fraction of delivered water that infiltrates. */
  efficiency: number;
  /** Largest net depth per pulse (mm), so ponding stays shallow. */
  maxPulseMm: number;
}

/**
 * Split a basin's irrigation into pulses. Each pulse soaks into progressively wetter soil (smaller Δθ, slower
 * infiltration); its wetting front is kept within the root zone. Leaching, when requested, is one final pulse.
 */
export function planPulses(p: PulsePlanInput): Pulse[] {
  const pulses: Pulse[] = [];
  const toPulse = (depth: number, depletion: number, leaching: boolean): Pulse => {
    const thetaI = Math.max(0, p.thetaFC - depletion / p.rootDepthMm);
    const dTheta = Math.max(0.01, p.soil.thetaS - thetaI);
    const volume = (depth * p.area) / 1000 / p.efficiency;
    return {
      depthMm: depth,
      volumeM3: volume,
      openMin: (60 * volume) / Math.max(1e-6, p.flowM3H),
      soakMin: 60 * timeToInfiltrate(depth, p.soil, dTheta),
      frontMm: depth / dTheta,
      rateMmH: meanPulseRate(depth, p.soil, dTheta),
      startRateMmH: meanPulseRate(Math.min(STEP_TEST_MM, depth), p.soil, dTheta),
      deltaTheta: dTheta,
      leaching,
    };
  };

  let remaining = Math.max(0, p.irrigationMm);
  let depletion = Math.max(0, p.depletionMm);
  if (remaining > 1e-6) {
    const count = Math.max(1, Math.ceil(remaining / p.maxPulseMm - 1e-9));
    const each = remaining / count;
    for (let i = 0; i < count; i++) {
      // The allocator never asks for more than the root zone can hold, so each front stays within it.
      pulses.push(toPulse(each, Math.max(0, depletion), false));
      depletion -= each;
      remaining -= each;
    }
  }
  if (p.leachingMm > 1e-6) pulses.push(toPulse(p.leachingMm, Math.max(0, depletion), true));
  return pulses;
}

export interface ScheduledPulse {
  basin: string;
  index: number;
  leaching: boolean;
  /** Minutes from the start of the day's water turn. */
  start: number;
  /** Valve closes. */
  end: number;
  /** Pulse fully soaked in; the next pulse for this basin may start after this plus the rest time. */
  soakEnd: number;
  volumeM3: number;
}

/**
 * Sequence pulses on a single shared source: one valve open at a time. At each step the highest-priority basin
 * whose previous pulse has soaked in (plus a short redistribution rest) is served; others fill the gaps.
 */
export function scheduleTurn(
  plans: { basin: string; priority: number; pulses: Pulse[] }[],
  restMin: number,
  startMin = 0,
): ScheduledPulse[] {
  const queue = plans
    .filter((p) => p.pulses.length > 0)
    .sort((a, b) => b.priority - a.priority)
    .map((p) => ({ ...p, next: 0, readyAt: startMin }));
  const out: ScheduledPulse[] = [];
  let clock = startMin;
  for (let guard = 0; guard < 500 && queue.some((q) => q.next < q.pulses.length); guard++) {
    const pending = queue.filter((q) => q.next < q.pulses.length);
    const ready = pending.filter((q) => q.readyAt <= clock + 1e-9);
    const pick = ready[0] ?? pending.reduce((a, b) => (b.readyAt < a.readyAt ? b : a));
    clock = Math.max(clock, pick.readyAt);
    const pulse = pick.pulses[pick.next];
    const end = clock + pulse.openMin;
    const soakEnd = clock + Math.max(pulse.openMin, pulse.soakMin);
    out.push({ basin: pick.basin, index: pick.next, leaching: pulse.leaching, start: clock, end, soakEnd, volumeM3: pulse.volumeM3 });
    pick.next += 1;
    pick.readyAt = soakEnd + restMin;
    clock = end;
  }
  return out;
}
