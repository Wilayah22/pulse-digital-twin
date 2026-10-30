"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  DEFAULT_CONFIG,
  DEFAULT_INPUTS,
  DEMO_WEATHER,
  SCENARIO_PRESETS,
  SITE,
  buildScenarioWeather,
  runSimulation,
  sanitizeInputs,
  type BasinId,
  type SimulationInputs,
  type SimulationResult,
  type WeatherSeries,
  type ImpactAssumptions,
} from "../engine";
import { useLang } from "../i18n/LanguageProvider";
import { getImpactServerSnapshot, getImpactSnapshot, saveImpact, subscribeImpact } from "./impactStore";
import { fetchAlAhsaForecast, type LiveWeather } from "../weather/openMeteo";

export type LiveStatus = "loading" | "ready" | "error";
export type Strategy = "pulse" | "traditional";

interface SimulationContextValue {
  draft: SimulationInputs;
  applied: SimulationInputs;
  setDraft: (update: (d: SimulationInputs) => SimulationInputs) => void;
  dirty: boolean;
  rerun: () => void;
  reset: () => void;
  applyPreset: (id: string) => void;
  activePreset: string | null;
  running: boolean;
  runId: number;

  live: { status: LiveStatus; data: LiveWeather | null; error: string | null };
  retryWeather: () => void;

  /** null while live weather is still loading for the first time. */
  result: SimulationResult | null;
  weather: WeatherSeries | null;

  selectedDay: number; // 1..7, the simulated day shown by the twin and highlighted in charts
  setSelectedDay: (d: number) => void;
  selectedBasin: BasinId | null;
  setSelectedBasin: (b: BasinId | null) => void;
  strategy: Strategy;
  setStrategy: (s: Strategy) => void;
  /** Oasis-scale impact assumptions, shared by the impact section, the tour and the PDF report. */
  impact: ImpactAssumptions;
  setImpact: (update: (a: ImpactAssumptions) => ImpactAssumptions) => void;
}

const SimulationContext = createContext<SimulationContextValue | null>(null);

function todayInRiyadh(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: SITE.timezone });
}

const RUN_ANIMATION_MS = 700;

export function SimulationProvider({ children }: { children: React.ReactNode }) {
  const [draft, setDraftState] = useState<SimulationInputs>(DEFAULT_INPUTS);
  const [applied, setApplied] = useState<SimulationInputs>(DEFAULT_INPUTS);
  const [activePreset, setActivePreset] = useState<string | null>("normal");
  const [running, setRunning] = useState(false);
  const [runId, setRunId] = useState(0);
  const [live, setLive] = useState<SimulationContextValue["live"]>({ status: "loading", data: null, error: null });
  const [selectedDay, setSelectedDay] = useState(1);
  const [selectedBasin, setSelectedBasin] = useState<BasinId | null>(null);
  const [strategy, setStrategy] = useState<Strategy>("pulse");
  const impact = useSyncExternalStore(subscribeImpact, getImpactSnapshot, getImpactServerSnapshot);
  const setImpact = useCallback((update: (a: ImpactAssumptions) => ImpactAssumptions) => saveImpact(update(getImpactSnapshot())), []);
  const runTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only the async callbacks set state; the initial "loading" state comes from useState.
  const fetchWeather = useCallback((force: boolean) => {
    fetchAlAhsaForecast({ force })
      .then((data) => setLive({ status: "ready", data, error: null }))
      .catch((e: unknown) =>
        setLive({ status: "error", data: null, error: e instanceof Error ? e.message : "تعذر الاتصال بخدمة الطقس" }),
      );
  }, []);

  useEffect(() => {
    fetchWeather(false);
  }, [fetchWeather]);

  const retryWeather = useCallback(() => {
    setLive((l) => ({ ...l, status: "loading", error: null }));
    fetchWeather(true);
  }, [fetchWeather]);

  useEffect(() => () => {
    if (runTimer.current) clearTimeout(runTimer.current);
  }, []);

  const weather = useMemo<WeatherSeries | null>(() => {
    const start = live.data?.series.days[0]?.date ?? todayInRiyadh();
    if (applied.weatherMode === "custom") return buildScenarioWeather(applied.customWeather, start, "custom");
    if (live.status === "ready" && live.data) return live.data.series;
    if (live.status === "error") return buildScenarioWeather(DEMO_WEATHER, start, "demo");
    return null;
  }, [applied.weatherMode, applied.customWeather, live]);

  const { lang } = useLang();
  const result = useMemo(() => (weather ? runSimulation(applied, weather, DEFAULT_CONFIG, lang) : null), [applied, weather, lang]);

  const startRun = useCallback((inputs: SimulationInputs) => {
    setApplied(inputs);
    setRunId((n) => n + 1);
    setRunning(true);
    if (runTimer.current) clearTimeout(runTimer.current);
    runTimer.current = setTimeout(() => setRunning(false), RUN_ANIMATION_MS);
  }, []);

  const setDraft = useCallback((update: (d: SimulationInputs) => SimulationInputs) => {
    setDraftState((d) => sanitizeInputs(update(d)));
    setActivePreset(null);
  }, []);

  const rerun = useCallback(() => startRun(draft), [draft, startRun]);

  const reset = useCallback(() => {
    setDraftState(DEFAULT_INPUTS);
    setActivePreset("normal");
    setSelectedDay(1);
    startRun(DEFAULT_INPUTS);
  }, [startRun]);

  const applyPreset = useCallback(
    (id: string) => {
      const preset = SCENARIO_PRESETS.find((p) => p.id === id);
      if (!preset) return;
      const next = sanitizeInputs(preset.apply(draft));
      setDraftState(next);
      setActivePreset(id);
      startRun(next);
    },
    [draft, startRun],
  );

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(applied), [draft, applied]);

  const value: SimulationContextValue = {
    draft,
    applied,
    setDraft,
    dirty,
    rerun,
    reset,
    applyPreset,
    activePreset,
    running,
    runId,
    live,
    retryWeather,
    result,
    weather,
    selectedDay,
    setSelectedDay,
    selectedBasin,
    setSelectedBasin,
    strategy,
    setStrategy,
    impact,
    setImpact,
  };

  return <SimulationContext.Provider value={value}>{children}</SimulationContext.Provider>;
}

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (!ctx) throw new Error("useSimulation must be used inside <SimulationProvider>");
  return ctx;
}
