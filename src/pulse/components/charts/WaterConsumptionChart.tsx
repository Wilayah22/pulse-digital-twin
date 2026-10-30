"use client";

import { useLang } from "../../i18n/LanguageProvider";
import { Bar, BarChart, CartesianGrid, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SimulationResult } from "../../engine";
import { COLORS } from "../ui";
import { AXIS, GRID, LegendItem, TooltipCard, dayFromClick } from "./shared";

export function WaterConsumptionChart({
  result,
  selectedDay,
  onSelectDay,
}: {
  result: SimulationResult;
  selectedDay: number;
  onSelectDay: (d: number) => void;
}) {
  const { t: tr } = useLang();
  const dayName = (d: number) => tr(`اليوم ${d}`, `Day ${d}`);
  const data = result.timeline.map((t, i) => ({
    name: dayName(t.day),
    pulse: result.pulse.dailyUse[i],
    traditional: result.traditional.dailyUse[i],
  }));
  return (
    <div>
      <div className="mb-1 flex gap-4 px-1">
        <LegendItem color={COLORS.forest} label="Pulse" />
        <LegendItem color={COLORS.traditional} label={tr("الري التقليدي", "Traditional")} />
      </div>
      <div dir="ltr" className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 8, left: -12, bottom: 0 }}
            barGap={3}
            onClick={(e) => {
              const d = dayFromClick(e);
              if (d) onSelectDay(d);
            }}
            className="cursor-pointer"
          >
            <CartesianGrid vertical={false} stroke={GRID} />
            <ReferenceArea x1={dayName(selectedDay)} x2={dayName(selectedDay)} fill="#2699C7" fillOpacity={0.08} />
            <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} unit="" label={{ value: tr("م³", "m³"), position: "insideTopLeft", offset: 12, ...AXIS }} />
            <Tooltip
              cursor={{ fill: "rgba(16,42,56,0.05)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={String(label)}
                    rows={[
                      { label: "Pulse", value: Number(payload[0].payload.pulse), unit: tr("م³", "m³"), color: COLORS.forest },
                      { label: tr("تقليدي", "Traditional"), value: Number(payload[0].payload.traditional), unit: tr("م³", "m³"), color: COLORS.traditional },
                    ]}
                    footer={
                      <>
                        {tr("الفرق:", "Difference:")}{" "}
                        <span className="num font-semibold text-white">
                          {(Number(payload[0].payload.traditional) - Number(payload[0].payload.pulse)).toFixed(1)} {tr("م³", "m³")}
                        </span>
                      </>
                    }
                  />
                ) : null
              }
            />
            <Bar dataKey="pulse" name="Pulse" fill={COLORS.forest} radius={[5, 5, 0, 0]} maxBarSize={22} animationDuration={700} />
            <Bar dataKey="traditional" name={tr("الري التقليدي", "Traditional")} fill={COLORS.traditional} radius={[5, 5, 0, 0]} maxBarSize={22} animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
