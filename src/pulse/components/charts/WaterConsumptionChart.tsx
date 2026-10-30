"use client";

import { useId } from "react";
import { Bar, CartesianGrid, ComposedChart, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { waterSavingPercent, type SimulationResult } from "../../engine";
import { useLang } from "../../i18n/LanguageProvider";
import { COLORS, fmt } from "../ui";
import { AXIS, GRID_PROPS, LegendItem, SELECTED_BAND, StatChip, TooltipCard, dayFromClick } from "./shared";

const TRAD = "#A9B4C2";
const SAVED = "#D9A441";

export function WaterConsumptionChart({
  result,
  selectedDay,
  onSelectDay,
  heightClass = "h-[300px] xl:h-[390px]",
}: {
  result: SimulationResult;
  selectedDay: number;
  onSelectDay: (d: number) => void;
  /** Tailwind height classes for the plot area (the PDF report uses a fixed height). */
  heightClass?: string;
}) {
  const { t: tr } = useLang();
  const uid = useId().replace(/:/g, "");
  const m3 = tr("م³", "m³");
  const dayName = (d: number) => tr(`اليوم ${d}`, `Day ${d}`);

  const data = result.timeline.map((t, i) => {
    const saved = result.traditional.dailyUse.slice(0, i + 1).reduce((a, v, k) => a + v - result.pulse.dailyUse[k], 0);
    return {
      name: dayName(t.day),
      pulse: result.pulse.dailyUse[i],
      traditional: result.traditional.dailyUse[i],
      saved: Math.max(0, saved),
    };
  });
  const saving = waterSavingPercent(result);

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex flex-wrap gap-3">
          <LegendItem color={COLORS.forest} label="Pulse" />
          <LegendItem color={TRAD} label={tr("الري التقليدي", "Traditional")} />
          <LegendItem color={SAVED} label={tr("التوفير التراكمي", "Cumulative saving")} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          <StatChip label="Pulse" value={`${fmt(result.pulse.totalUsed)} ${m3}`} />
          <StatChip label={tr("تقليدي", "Traditional")} value={`${fmt(result.traditional.totalUsed)} ${m3}`} />
          <StatChip label={tr("توفير", "Saving")} value={`${fmt(saving, 0)}%`} tone={saving > 0.5 ? "good" : "neutral"} />
        </div>
      </div>
      <div dir="ltr" className={heightClass}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 4, left: 0, bottom: 0 }}
            barGap={3}
            barCategoryGap="22%"
            onClick={(e) => {
              const d = dayFromClick(e);
              if (d) onSelectDay(d);
            }}
            className="cursor-pointer"
          >
            <defs>
              <linearGradient id={`${uid}-pulse`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#24946E" />
                <stop offset="100%" stopColor="#176B50" />
              </linearGradient>
              <linearGradient id={`${uid}-trad`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#C9D2DC" />
                <stop offset="100%" stopColor="#A9B4C2" />
              </linearGradient>
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <ReferenceArea x1={dayName(selectedDay)} x2={dayName(selectedDay)} yAxisId="m3" {...SELECTED_BAND} />
            <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} dy={6} />
            <YAxis yAxisId="m3" tick={AXIS} axisLine={false} tickLine={false} width={44} tickFormatter={(v) => `${v}`} />
            <YAxis yAxisId="saved" orientation="right" tick={{ ...AXIS, fill: "#B7862F" }} axisLine={false} tickLine={false} width={36} />
            <Tooltip
              cursor={{ fill: "rgba(16,42,56,0.04)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={String(label)}
                    rows={[
                      { label: "Pulse", value: Number(payload[0].payload.pulse), unit: m3, color: COLORS.forest },
                      { label: tr("تقليدي", "Traditional"), value: Number(payload[0].payload.traditional), unit: m3, color: TRAD },
                      { label: tr("التوفير التراكمي", "Cumulative saving"), value: Number(payload[0].payload.saved), unit: m3, color: SAVED },
                    ]}
                  />
                ) : null
              }
            />
            <Bar yAxisId="m3" dataKey="traditional" fill={`url(#${uid}-trad)`} radius={[6, 6, 2, 2]} maxBarSize={20} animationDuration={700} />
            <Bar yAxisId="m3" dataKey="pulse" fill={`url(#${uid}-pulse)`} radius={[6, 6, 2, 2]} maxBarSize={20} animationDuration={700} />
            <Line
              yAxisId="saved"
              type="monotone"
              dataKey="saved"
              stroke={SAVED}
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#fff", stroke: SAVED, strokeWidth: 2 }}
              activeDot={{ r: 5 }}
              animationDuration={900}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
