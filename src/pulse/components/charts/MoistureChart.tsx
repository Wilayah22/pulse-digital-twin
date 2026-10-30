"use client";

import { useId, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { BasinId, SimulationResult } from "../../engine";
import { useLang } from "../../i18n/LanguageProvider";
import { BASIN_COLORS } from "../ui";
import { AXIS, GRID_PROPS, Gradient, LegendToggle, SELECTED_BAND, TooltipCard, dayFromClick } from "./shared";

const IDS: BasinId[] = ["A", "B", "C"];

/**
 * Available-water content per basin. The filled area is moisture after irrigation; the thin dashed line is the
 * reading before irrigation, so the gap between them is the day's irrigation. The shaded floor is the stress zone.
 */
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
  const { t: tr } = useLang();
  const uid = useId().replace(/:/g, "");
  const [shown, setShown] = useState<Record<BasinId, boolean>>({ A: true, B: true, C: true });
  const [showBefore, setShowBefore] = useState(true);
  const dayName = (d: number) => tr(`اليوم ${d}`, `Day ${d}`);
  const s = strategy === "pulse" ? result.pulse : result.traditional;
  const rawPct = 100 * (1 - s.basins[0].raw / s.basins[0].taw);
  const data = result.timeline.map((t, i) => {
    const row: Record<string, number | string> = { name: dayName(t.day) };
    for (const b of s.basins) {
      row[`${b.id}_pre`] = b.days[i].moistureBefore;
      row[`${b.id}_post`] = b.days[i].moistureAfter;
    }
    return row;
  });
  const visible = IDS.filter((id) => shown[id]);

  return (
    <div>
      <div className="mb-2 flex flex-wrap gap-1.5 px-1">
        {IDS.map((id) => (
          <LegendToggle
            key={id}
            color={BASIN_COLORS[id]}
            label={tr(`الحوض ${id}`, `Basin ${id}`)}
            active={shown[id]}
            onToggle={() => setShown((x) => ({ ...x, [id]: !x[id] }))}
          />
        ))}
        <LegendToggle color="#718096" label={tr("قبل الري", "Before irrigation")} active={showBefore} onToggle={() => setShowBefore((v) => !v)} dashed />
      </div>
      <div dir="ltr" className="h-[270px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 10, left: 0, bottom: 0 }}
            onClick={(e) => {
              const d = dayFromClick(e);
              if (d) onSelectDay(d);
            }}
            className="cursor-pointer"
          >
            <defs>
              {IDS.map((id) => (
                <Gradient key={id} id={`${uid}-${id}`} color={BASIN_COLORS[id]} from={0.1} to={0} />
              ))}
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <ReferenceArea
              y1={0}
              y2={rawPct}
              fill="#DC5B52"
              fillOpacity={0.05}
              strokeOpacity={0}
              label={{ value: tr("منطقة الإجهاد المائي", "Water-stress zone"), position: "insideBottomRight", fontSize: 10, fill: "#C2554D" }}
            />
            <ReferenceLine y={rawPct} stroke="#E6A23C" strokeDasharray="5 4" strokeOpacity={0.9} />
            <ReferenceArea x1={dayName(selectedDay)} x2={dayName(selectedDay)} {...SELECTED_BAND} />
            <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} dy={6} />
            <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tick={AXIS} axisLine={false} tickLine={false} unit="%" width={44} />
            <Tooltip
              cursor={{ stroke: "#CBD2D9", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={String(label)}
                    rows={visible.flatMap((id) => [
                      { label: tr(`${id} قبل`, `${id} before`), value: Number(payload[0].payload[`${id}_pre`]), unit: "%", color: BASIN_COLORS[id], digits: 0, dashed: true },
                      { label: tr(`${id} بعد`, `${id} after`), value: Number(payload[0].payload[`${id}_post`]), unit: "%", color: BASIN_COLORS[id], digits: 0 },
                    ])}
                  />
                ) : null
              }
            />
            {visible.map((id) => (
              <Area
                key={`${id}_post`}
                type="monotone"
                dataKey={`${id}_post`}
                stroke={BASIN_COLORS[id]}
                strokeWidth={2.5}
                fill={`url(#${uid}-${id})`}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                animationDuration={800}
              />
            ))}
            {showBefore &&
              visible.map((id) => (
                <Line
                  key={`${id}_pre`}
                  type="monotone"
                  dataKey={`${id}_pre`}
                  stroke={BASIN_COLORS[id]}
                  strokeWidth={1.4}
                  strokeDasharray="4 4"
                  strokeOpacity={0.75}
                  dot={false}
                  activeDot={false}
                  animationDuration={800}
                />
              ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
