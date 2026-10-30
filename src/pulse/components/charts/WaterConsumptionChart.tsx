"use client";

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
  const data = result.timeline.map((t, i) => ({
    name: `اليوم ${t.day}`,
    pulse: result.pulse.dailyUse[i],
    traditional: result.traditional.dailyUse[i],
  }));
  return (
    <div>
      <div className="mb-1 flex gap-4 px-1">
        <LegendItem color={COLORS.forest} label="Pulse" />
        <LegendItem color={COLORS.traditional} label="الري التقليدي" />
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
            <ReferenceArea x1={`اليوم ${selectedDay}`} x2={`اليوم ${selectedDay}`} fill="#2699C7" fillOpacity={0.08} />
            <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tick={AXIS} axisLine={false} tickLine={false} unit="" label={{ value: "م³", position: "insideTopLeft", offset: 12, ...AXIS }} />
            <Tooltip
              cursor={{ fill: "rgba(16,42,56,0.05)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={String(label)}
                    rows={[
                      { label: "Pulse", value: Number(payload[0].payload.pulse), unit: "م³", color: COLORS.forest },
                      { label: "تقليدي", value: Number(payload[0].payload.traditional), unit: "م³", color: COLORS.traditional },
                    ]}
                    footer={
                      <>
                        الفرق:{" "}
                        <span className="num font-semibold text-white">
                          {(Number(payload[0].payload.traditional) - Number(payload[0].payload.pulse)).toFixed(1)} م³
                        </span>
                      </>
                    }
                  />
                ) : null
              }
            />
            <Bar dataKey="pulse" name="Pulse" fill={COLORS.forest} radius={[5, 5, 0, 0]} maxBarSize={22} animationDuration={700} />
            <Bar dataKey="traditional" name="الري التقليدي" fill={COLORS.traditional} radius={[5, 5, 0, 0]} maxBarSize={22} animationDuration={700} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
