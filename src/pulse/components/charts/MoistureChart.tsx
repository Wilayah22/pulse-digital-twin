"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BasinId, SimulationResult } from "../../engine";
import { BASIN_COLORS } from "../ui";
import { AXIS, GRID, LegendItem, TooltipCard, dayFromClick } from "./shared";

const IDS: BasinId[] = ["A", "B", "C"];

export function MoistureChart({
  result,
  strategy,
  selectedDay,
  onSelectDay,
}: {
  result: SimulationResult;
  strategy: "pulse" | "traditional";
  selectedDay: number;
  onSelectDay: (d: number) => void;
}) {
  const s = strategy === "pulse" ? result.pulse : result.traditional;
  const rawPct = 100 * (1 - s.basins[0].raw / s.basins[0].taw);
  const data = result.timeline.map((t, i) => {
    const row: Record<string, number | string> = { name: `اليوم ${t.day}` };
    for (const b of s.basins) {
      row[`${b.id}_pre`] = b.days[i].moistureBefore;
      row[`${b.id}_post`] = b.days[i].moistureAfter;
    }
    return row;
  });
  return (
    <div>
      <div className="mb-1 flex flex-wrap gap-x-4 gap-y-1 px-1">
        {IDS.map((id) => (
          <LegendItem key={id} color={BASIN_COLORS[id]} label={`الحوض ${id}`} />
        ))}
        <LegendItem color="#718096" label="بعد الري" />
        <LegendItem color="#718096" label="قبل الري" dashed />
      </div>
      <div dir="ltr" className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
            onClick={(e) => {
              const d = dayFromClick(e);
              if (d) onSelectDay(d);
            }}
            className="cursor-pointer"
          >
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={AXIS} axisLine={false} tickLine={false} unit="%" />
            <ReferenceLine
              y={rawPct}
              stroke="#E6A23C"
              strokeDasharray="4 4"
              label={{ value: "حد الإجهاد (RAW)", position: "insideBottomRight", fontSize: 10, fill: "#B7862F" }}
            />
            <ReferenceLine x={`اليوم ${selectedDay}`} stroke="#2699C7" strokeOpacity={0.35} strokeWidth={8} />
            <Tooltip
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={String(label)}
                    rows={IDS.flatMap((id) => [
                      { label: `${id} قبل`, value: Number(payload[0].payload[`${id}_pre`]), unit: "%", color: BASIN_COLORS[id], digits: 0, dashed: true },
                      { label: `${id} بعد`, value: Number(payload[0].payload[`${id}_post`]), unit: "%", color: BASIN_COLORS[id], digits: 0 },
                    ])}
                  />
                ) : null
              }
            />
            {IDS.map((id) => (
              <Line
                key={`${id}_pre`}
                type="monotone"
                dataKey={`${id}_pre`}
                stroke={BASIN_COLORS[id]}
                strokeWidth={1.8}
                strokeDasharray="5 4"
                dot={false}
                strokeOpacity={0.7}
                animationDuration={700}
              />
            ))}
            {IDS.map((id) => (
              <Line
                key={`${id}_post`}
                type="monotone"
                dataKey={`${id}_post`}
                stroke={BASIN_COLORS[id]}
                strokeWidth={2.5}
                dot={{ r: 3, strokeWidth: 0, fill: BASIN_COLORS[id] }}
                activeDot={{ r: 5 }}
                animationDuration={700}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
