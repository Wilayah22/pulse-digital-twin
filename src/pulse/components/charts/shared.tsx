"use client";

import { useLang } from "../../i18n/LanguageProvider";
import type { MouseHandlerDataParam } from "recharts";
import { fmt } from "../ui";

export const AXIS = { fontSize: 11, fill: "#718096" } as const;
export const GRID = "#ECEAE3";

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
