import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BASINS,
  DEFAULT_CONFIG,
  DEFAULT_INPUTS,
  DEMO_WEATHER,
  SCENARIO_PRESETS,
  SOIL,
  allocatePulse,
  applyWaterInputs,
  buildScenarioWeather,
  deliverySchedule,
  estimateImpact,
  cumulativeInfiltration,
  timeToInfiltrate,
  infiltrationRate,
  planPulses,
  scheduleTurn,
  MAX_PULSE_MM,
  PULSE_REST_MIN,
  GA_SOIL,
  sanitizeImpact,
  DEFAULT_IMPACT,
  extraterrestrialRadiation,
  forecastRainDrainage,
  leachingRequirement,
  penmanMonteithET0,
  readilyAvailableWater,
  runSimulation,
  sanitizeInputs,
  saturationWater,
  totalAvailableWater,
  updateSoilSalinity,
  waterStressCoefficient,
  weightedWaterFilling,
  windAt2m,
  type SimulationInputs,
} from "../index";

const near = (actual: number, expected: number, tol: number, msg?: string) =>
  assert.ok(Math.abs(actual - expected) <= tol, `${msg ?? ""} expected ${expected} ± ${tol}, got ${actual}`);

const START = "2026-07-15";
const weather = (p = DEMO_WEATHER) => buildScenarioWeather(p, START, "demo");
const run = (overrides: Partial<SimulationInputs> = {}, w = weather()) =>
  runSimulation({ ...DEFAULT_INPUTS, weatherMode: "custom", ...overrides }, w);

describe("FAO-56 evapotranspiration", () => {
  it("reproduces Example 18 (Brussels, 6 July): ET0 ≈ 3.9 mm/day", () => {
    const et0 = penmanMonteithET0({
      tMax: 21.5,
      tMin: 12.3,
      u2: 2.078,
      rs: 22.07,
      ea: 1.409,
      latitude: 50.8,
      elevation: 100,
      doy: 187,
    });
    near(et0, 3.9, 0.1);
  });

  it("reproduces Example 8: Ra at 20°S on 3 September ≈ 32.2 MJ/m²/day", () => {
    near(extraterrestrialRadiation(-20, 246), 32.2, 0.2);
  });

  it("converts 10 m wind to 2 m (Example 14: 3.2 → 2.4 m/s)", () => {
    near(windAt2m(3.2, 10), 2.4, 0.05);
  });

  it("gives higher ET0 for hotter, windier scenarios", () => {
    const mild = weather({ temperature: 35, wind: 2, rainfall: 0, dust: "none" });
    const hot = weather({ temperature: 48, wind: 7, rainfall: 0, dust: "none" });
    assert.ok(hot.days[0].et0 > mild.days[0].et0);
  });

  it("dust lowers radiation-driven ET0", () => {
    const clear = weather({ temperature: 40, wind: 3, rainfall: 0, dust: "none" });
    const dusty = weather({ temperature: 40, wind: 3, rainfall: 0, dust: "severe" });
    assert.ok(dusty.days[0].et0 < clear.days[0].et0);
  });
});

describe("soil water balance", () => {
  it("computes TAW and RAW from soil properties", () => {
    near(totalAvailableWater(SOIL), 120, 1e-9);
    near(readilyAvailableWater(SOIL), 60, 1e-9);
  });

  it("applies FAO-56 Ks", () => {
    assert.equal(waterStressCoefficient(30, 120, 60), 1);
    near(waterStressCoefficient(90, 120, 60), 0.5, 1e-9);
    assert.equal(waterStressCoefficient(130, 120, 60), 0);
  });

  it("sends water above field capacity to deep percolation", () => {
    assert.deepEqual(applyWaterInputs(20, 30), { depletion: 0, deepPercolation: 10 });
    assert.deepEqual(applyWaterInputs(20, 5), { depletion: 15, deepPercolation: 0 });
  });
});

describe("salinity", () => {
  it("computes the FAO-29 leaching requirement", () => {
    near(leachingRequirement(2.5, 4), 2.5 / 17.5, 1e-9);
  });

  it("conserves salt when there is no drainage", () => {
    const wSat = saturationWater(SOIL);
    const ece = updateSoilSalinity(4, 50, 2.5, 0, SOIL);
    near(ece * wSat, 4 * wSat + 50 * 2.5, 1e-6);
  });

  it("removes salt with drainage", () => {
    assert.ok(updateSoilSalinity(5, 50, 2.5, 30, SOIL) < updateSoilSalinity(5, 50, 2.5, 0, SOIL));
  });
});

describe("allocation", () => {
  it("weighted water filling respects both budget and requests", () => {
    const out = weightedWaterFilling(
      [
        { id: "A", amount: 10, weight: 0.8 },
        { id: "B", amount: 2, weight: 0.5 },
        { id: "C", amount: 0, weight: 0.2 },
      ],
      8,
    );
    near(out.A + out.B + out.C, 8, 1e-9);
    assert.ok(out.B <= 2 + 1e-9);
    assert.equal(out.C, 0);
  });

  it("never allocates more than the reservoir holds", () => {
    const snaps = BASINS.map((b) => ({
      id: b.id,
      area: b.area,
      depletion: 100,
      ece: 6,
      etc: 9,
      effectiveRain: 0,
      taw: 120,
      raw: 60,
      wSat: saturationWater(SOIL),
      ecw: 3,
    }));
    const d = allocatePulse(snaps, DEFAULT_CONFIG.crop, 0.2, 5, 0, 50);
    assert.ok(d.allocations.A + d.allocations.B + d.allocations.C <= 5 + 1e-9);
    assert.ok(d.rationed);
    assert.ok(d.leachingWithheld, "no leaching when water is short");
  });

  it("gives the driest basin the largest share under scarcity", () => {
    const r = run({ availableWater: 40 });
    const day1 = r.pulse.basins.map((b) => b.days[0].irrigationVolume);
    assert.ok(day1[0] >= day1[1] && day1[0] >= day1[2]);
  });
});

describe("rain-aware leaching", () => {
  it("forecasts drainage from rain exceeding the depletion built up before it", () => {
    near(forecastRainDrainage([5, 5, 5], [0, 0, 20], 0), 10, 1e-9);
    near(forecastRainDrainage([5, 5, 5], [0, 0, 20], 0, 30), 0, 1e-9);
  });

  it("defers leaching to forecast rain instead of drawing on the reservoir", () => {
    const snaps = BASINS.map((b) => ({
      id: b.id,
      area: b.area,
      depletion: 40,
      ece: 6,
      etc: 5,
      effectiveRain: 0,
      taw: 120,
      raw: 60,
      wSat: saturationWater(SOIL),
      ecw: 2.5,
    }));
    const rain = { etc: [5, 5, 5, 5], effectiveRain: [0, 0, 60, 0], today: 0 };
    const d = allocatePulse(snaps, DEFAULT_CONFIG.crop, 0.15, 500, 0, 0, true, rain);
    assert.deepEqual([...d.leachingByRain].sort(), ["A", "B", "C"]);
    assert.equal(d.leaching.A + d.leaching.B + d.leaching.C, 0);
    assert.equal(d.leachingWithheld, false);
  });

  it("only credits rain for basins whose salinity it lowers after the rain arrives", () => {
    const preset = SCENARIO_PRESETS.find((p) => p.id === "rain")!;
    const inputs = preset.apply(DEFAULT_INPUTS);
    const r = runSimulation(inputs, buildScenarioWeather(inputs.customWeather, START, "custom"));
    const rec = r.recommendations.find((x) => x.id === "leaching-rain");
    assert.ok(rec, "expected a rain-leaching recommendation");
    const firstRain = r.pulse.basins[0].days.find((d) => d.effectiveRain > 0)!.day;
    for (const b of r.pulse.basins) {
      if (!rec.action.includes(` ${b.id}`) && !rec.action.includes(`و${b.id}`)) continue;
      const beforeRain = firstRain > 1 ? b.days[firstRain - 2].eceEnd : b.initial.ece;
      assert.ok(b.days[b.days.length - 1].eceEnd < beforeRain, `rain should lower basin ${b.id} salinity`);
    }
  });
});

describe("simulation", () => {
  it("is deterministic", () => {
    assert.deepEqual(run(), run());
  });

  it("never uses more water than has been delivered, day by day", () => {
    for (const preset of SCENARIO_PRESETS) {
      const inputs = preset.apply({ ...DEFAULT_INPUTS, weatherMode: "custom" });
      const r = runSimulation(inputs, buildScenarioWeather(inputs.customWeather, START, "custom"));
      for (const s of [r.pulse, r.traditional]) {
        let delivered = 0;
        let used = 0;
        r.timeline.forEach((t, i) => {
          delivered += t.delivered;
          used += s.dailyUse[i];
          assert.ok(used <= delivered + 1e-6, `${preset.id}/${s.strategy} day ${i + 1}`);
        });
        assert.ok(s.totalUsed <= inputs.availableWater + 1e-6);
      }
    }
  });

  it("keeps depletion within [0, TAW]", () => {
    const r = run({ availableWater: 20 }, weather({ temperature: 50, wind: 12, rainfall: 0, dust: "none" }));
    for (const b of [...r.pulse.basins, ...r.traditional.basins]) {
      for (const d of b.days) {
        assert.ok(d.depletionEnd >= 0 && d.depletionEnd <= b.taw + 1e-9);
      }
    }
  });

  it("uses less water than the fixed-share baseline when supply is ample", () => {
    const r = run();
    assert.ok(r.pulse.totalUsed < r.traditional.totalUsed);
  });

  it("stops deliveries during an outage", () => {
    const s = deliverySchedule({ ...DEFAULT_INPUTS, outageFromDay: 4 }, 7);
    assert.deepEqual(s.actual.slice(3), [0, 0, 0, 0]);
    near(s.actual.reduce((a, b) => a + b, 0), (120 / 7) * 3, 1e-9);
  });

  it("shifts a delayed turn into day 2 without losing water", () => {
    const s = deliverySchedule({ ...DEFAULT_INPUTS, delayHours: 6 }, 7);
    near(s.actual.reduce((a, b) => a + b, 0), 120, 1e-9);
    near(s.actual[0], (120 / 7) * 0.75, 1e-9);
  });

  it("does not recommend leaching when soil salinity is below the crop threshold", () => {
    const lowSalt = { ...DEFAULT_CONFIG, basins: BASINS.map((b) => ({ ...b, initialEce: 2 })) };
    const r = runSimulation({ ...DEFAULT_INPUTS, ecw: 1 }, weather(), lowSalt);
    assert.ok(!r.recommendations.some((x) => x.kind === "leaching"));
  });

  it("rejects weather series that are too short", () => {
    const w = weather();
    assert.throws(() => runSimulation(DEFAULT_INPUTS, { ...w, days: w.days.slice(0, 3) }));
  });
});

describe("input validation", () => {
  it("clamps out-of-range and non-numeric inputs", () => {
    const s = sanitizeInputs({ availableWater: 9999, ecw: Number.NaN, delayHours: -3, kc: 5 } as Partial<SimulationInputs>);
    assert.equal(s.availableWater, 200);
    assert.equal(s.ecw, DEFAULT_INPUTS.ecw);
    assert.equal(s.delayHours, 0);
    assert.equal(s.kc, 1.2);
  });
});

describe("oasis impact estimate", () => {
  it("scales the simulated weekly saving by basins and weeks", () => {
    const r = run();
    const est = estimateImpact(r, {
      basins: 100,
      weeksPerYear: 10,
      pumpingKwhPerM3: 0.5,
      tariffSarPerKwh: 0.2,
      litresPerPersonDay: 250,
      co2KgPerKwh: 0.5,
    });
    const perBasin = (r.traditional.totalUsed - r.pulse.totalUsed) / 3;
    near(est.savedPerBasinWeek, perBasin, 1e-9);
    near(est.annualWaterM3, perBasin * 1000, 1e-6);
    near(est.energyKwh, est.annualWaterM3 * 0.5, 1e-6);
    near(est.costSar, est.energyKwh * 0.2, 1e-6);
    near(est.peopleEquivalent, est.annualWaterM3 / ((250 * 365) / 1000), 1e-6);
  });

  it("restores invalid stored assumptions to defaults", () => {
    const s = sanitizeImpact({ basins: 20000, weeksPerYear: -3, pumpingKwhPerM3: "x", tariffSarPerKwh: Number.NaN, extra: 1 });
    assert.equal(s.basins, 20000);
    assert.equal(s.weeksPerYear, DEFAULT_IMPACT.weeksPerYear);
    assert.equal(s.pumpingKwhPerM3, DEFAULT_IMPACT.pumpingKwhPerM3);
    assert.equal(s.tariffSarPerKwh, DEFAULT_IMPACT.tariffSarPerKwh);
    assert.deepEqual(sanitizeImpact(null), DEFAULT_IMPACT);
    assert.ok(!("extra" in s));
  });

  it("never reports negative savings", () => {
    const r = run();
    const flipped = { pulse: r.traditional, traditional: r.pulse };
    assert.equal(estimateImpact(flipped).annualWaterM3, 0);
  });
});

describe("Green-Ampt pulses (hydraulic layer)", () => {
  const soil = { ...GA_SOIL, ksMmH: 10.9 };

  it("inverts cleanly between time and cumulative infiltration", () => {
    for (const f of [1, 5, 20, 60]) {
      const t = timeToInfiltrate(f, soil, 0.25);
      near(cumulativeInfiltration(t, soil, 0.25), f, 1e-6);
    }
  });

  it("matches the early-time √t limit and slows towards Ks", () => {
    const t = 0.001;
    near(cumulativeInfiltration(t, soil, 0.25), Math.sqrt(2 * soil.ksMmH * soil.psiMm * 0.25 * t), 0.01);
    assert.ok(infiltrationRate(5, soil, 0.25) > infiltrationRate(50, soil, 0.25));
    near(infiltrationRate(1e7, soil, 0.25), soil.ksMmH, 1e-3);
  });

  it("splits irrigation into pulses that carry exactly the allocated water", () => {
    const base = { depletionMm: 70, area: 250, thetaFC: 0.2, rootDepthMm: 1000, soil, flowM3H: 8, efficiency: 0.9, maxPulseMm: 20 };
    const pulses = planPulses({ ...base, irrigationMm: 55, leachingMm: 8 });
    assert.equal(pulses.filter((p) => !p.leaching).length, 3);
    assert.ok(pulses[pulses.length - 1].leaching);
    near(pulses.reduce((a, p) => a + p.depthMm, 0), 63, 1e-9);
    for (const p of pulses.filter((x) => !x.leaching)) assert.ok(p.frontMm < base.rootDepthMm);
    // Each pulse meets wetter soil, so the step-test speed falls pulse after pulse.
    assert.ok(pulses[0].startRateMmH > pulses[1].startRateMmH);
  });

  it("reads a dry basin as faster than a wet one in the first pulse", () => {
    const base = { irrigationMm: 10, leachingMm: 0, area: 250, thetaFC: 0.2, rootDepthMm: 1000, soil, flowM3H: 8, efficiency: 0.9, maxPulseMm: 20 };
    const dry = planPulses({ ...base, depletionMm: 90 })[0];
    const wet = planPulses({ ...base, depletionMm: 15 })[0];
    assert.ok(dry.startRateMmH > wet.startRateMmH);
  });

  it("opens one valve at a time and rests each basin between its pulses", () => {
    const mk = (n: number) => planPulses({ irrigationMm: n, leachingMm: 0, depletionMm: n, area: 250, thetaFC: 0.2, rootDepthMm: 1000, soil, flowM3H: 8, efficiency: 0.9, maxPulseMm: 20 });
    const sched = scheduleTurn(
      [
        { basin: "A", priority: 0.9, pulses: mk(60) },
        { basin: "B", priority: 0.5, pulses: mk(30) },
      ],
      20,
    );
    assert.equal(sched[0].basin, "A", "highest priority goes first");
    const byStart = [...sched].sort((a, b) => a.start - b.start);
    for (let i = 1; i < byStart.length; i++) assert.ok(byStart[i].start >= byStart[i - 1].end - 1e-9, "no overlapping valves");
    for (const b of ["A", "B"]) {
      const mine = sched.filter((e) => e.basin === b);
      for (let i = 1; i < mine.length; i++) assert.ok(mine[i].start >= mine[i - 1].soakEnd + 20 - 1e-9);
    }
  });

  it("schedules exactly the water each strategy uses, in pulses no deeper than the limit", () => {
    const r = run();
    for (const s of [r.pulse, r.traditional]) {
      s.schedules.forEach((day, i) => near(day.reduce((a, e) => a + e.volumeM3, 0), s.dailyUse[i], 1e-6));
    }
    for (const b of r.pulse.basins) for (const d of b.days) for (const p of d.pulses) assert.ok(p.depthMm <= MAX_PULSE_MM + 1e-9);
    assert.ok(PULSE_REST_MIN > 0);
  });
});
