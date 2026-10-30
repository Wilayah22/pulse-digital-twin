"use client";

import { useLang } from "../../i18n/LanguageProvider";
import type { MouseHandlerDataParam } from "recharts";
import { fmt } from "../ui";

export const AXIS = { fontSize: 11, fill: "#8A96A3" } as const;
export const GRID = "#EDEEE9";
/** Horizontal dashed gridlines only, the house style for every chart. */
export const GRID_PROPS = { vertical: false, stroke: GRID, strokeDasharray: "4 4" } as const;
/** Soft band marking the day selected in the digital twin. */
export const SELECTED_BAND = { fill: "#2699C7", fillOpacity: 0.07, strokeOpacity: 0 } as const;

export interface TooltipRow {
  label: string;
  value: number;
  unit: string;
  color: string;
  digits?: number;
  dashed?: boolean;
}

export function TooltipCard({ title, rows, footer }: { title: string; rows: TooltipRow[]; footer?: React.ReactNode }) {
  const { dir } = useLang();
  return (
    <div dir={dir} className="min-w-44 rounded-xl bg-pn-navy px-3 py-2 text-xs text-white shadow-xl">
      <div className="mb-1 font-semibold">{title}</div>
      {rows.map((r) => (
        <div key={r.label} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-white/80">
            <span
              className="inline-block h-2 w-3 rounded-sm"
              style={r.dashed ? { borderTop: `2px dashed ${r.color}`, height: 0 } : { backgroundColor: r.color }}
            />
            {r.label}
          </span>
          <span className="num font-semibold">
            {fmt(r.value, r.digits ?? 1)} <span className="text-white/60">{r.unit}</span>
          </span>
        </div>
      ))}
      {footer && <div className="mt-1 border-t border-white/15 pt-1 text-white/70">{footer}</div>}
    </div>
  );
}

/** Convert a chart click into a 1-based simulation day, or null when the click missed a data point. */
export function dayFromClick(e: MouseHandlerDataParam, offset = 1): number | null {
  const idx = Number(e?.activeTooltipIndex);
  return Number.isFinite(idx) ? idx + offset : null;
}

export function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-pn-muted">
      <span
        className="inline-block w-4"
        style={dashed ? { borderTop: `2px dashed ${color}` } : { height: 8, borderRadius: 2, backgroundColor: color }}
      />
      {label}
    </span>
  );
}

/** Clickable legend chip that shows or hides a series. */
export function LegendToggle({
  color,
  label,
  active,
  onToggle,
  dashed,
}: {
  color: string;
  label: string;
  active: boolean;
  onToggle: () => void;
  dashed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all ${
        active ? "border-pn-line bg-white text-pn-ink shadow-sm" : "border-transparent bg-pn-bg text-pn-muted/70 line-through"
      }`}
    >
      <span
        className="inline-block w-3"
        style={dashed ? { borderTop: `2px dashed ${color}` } : { height: 8, borderRadius: 999, backgroundColor: active ? color : "#CBD2D9" }}
      />
      {label}
    </button>
  );
}

/** Compact headline figure shown above a chart. */
export function StatChip({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "neutral" | "good" | "bad" }) {
  const color = tone === "good" ? "#176B50" : tone === "bad" ? "#DC5B52" : "#102A38";
  const bg = tone === "good" ? "#E6F4EC" : tone === "bad" ? "#FBE7E5" : "#F2F3EF";
  return (
    <span className="flex items-baseline gap-1.5 rounded-lg px-2.5 py-1" style={{ backgroundColor: bg }}>
      <span className="text-[10px] text-pn-muted">{label}</span>
      <span className="num text-[13px] font-bold" style={{ color }}>
        {value}
      </span>
    </span>
  );
}

/** Vertical gradient definition for area and bar fills. */
export function Gradient({ id, color, from = 0.35, to = 0.02 }: { id: string; color: string; from?: number; to?: number }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={from} />
      <stop offset="100%" stopColor={color} stopOpacity={to} />
    </linearGradient>
  );
}
