"use client";

import { CloudRain, CloudSun, Droplets, FlaskConical, PlugZap, Timer, Wind, type LucideIcon } from "lucide-react";
import { SCENARIO_PRESETS } from "../engine";
import { useSimulation } from "../state/SimulationProvider";

const ICONS: Record<string, LucideIcon> = {
  normal: CloudSun,
  "water-cut": Droplets,
  "high-salinity": FlaskConical,
  delay: Timer,
  heatwave: Wind,
  rain: CloudRain,
  outage: PlugZap,
};

export function ScenarioPresets() {
  const { applyPreset, activePreset } = useSimulation();
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-bold text-pn-navy">سيناريوهات جاهزة</h3>
        <span className="text-[11px] text-pn-muted">اختر سيناريو لترى كيف يغيّر Pulse قراراته فوراً</span>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {SCENARIO_PRESETS.map((p) => {
          const Icon = ICONS[p.id] ?? CloudSun;
          const on = activePreset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => applyPreset(p.id)}
              aria-pressed={on}
              className={`group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start transition-all duration-200 ${
                on
                  ? "border-pn-forest bg-pn-forest text-white shadow-[0_8px_20px_-10px_rgba(23,107,80,0.8)]"
                  : "border-pn-line bg-white text-pn-ink hover:-translate-y-0.5 hover:border-pn-forest/40 hover:shadow-sm"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${on ? "bg-white/15 text-white" : "bg-pn-bg text-pn-forest"}`}
              >
                <Icon size={16} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-bold">{p.name}</span>
                <span className={`block truncate text-[10px] ${on ? "text-white/75" : "text-pn-muted"}`}>{p.description}</span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
