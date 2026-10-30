"use client";

import { useLang } from "../../i18n/LanguageProvider";
import { TriangleAlert } from "lucide-react";
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CROP, type BasinId, type SimulationResult } from "../../engine";
import { BASIN_COLORS, COLORS, fmt } from "../ui";
import { AXIS, GRID, LegendItem, TooltipCard, dayFromClick } from "./shared";

const IDS: BasinId[] = ["A", "B", "C"];

export function SalinityChart({
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
  const dayName = (d: number) => tr(`اليوم ${d}`, `Day ${d}`);
  const s = strategy === "pulse" ? result.pulse : result.traditional;
  const threshold = CROP.eceThreshold;
  const data = [
    { name: tr("البداية", "Start"), ...Object.fromEntries(s.basins.map((b) => [b.id, b.initial.ece])) },
    ...result.timeline.map((t, i) => ({
      name: dayName(t.day),
      ...Object.fromEntries(s.basins.map((b) => [b.id, b.days[i].eceEnd])),
    })),
  ] as Record<string, number | string>[];
  const values = data.flatMap((r) => IDS.map((id) => Number(r[id])));
  const yMax = Math.ceil(Math.max(threshold + 1, ...values) + 0.5);
  const above = s.basins.filter((b) => b.days[b.days.length - 1].eceEnd > threshold);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-x-4 gap-y-1 px-1">
        {IDS.map((id) => (
          <LegendItem key={id} color={BASIN_COLORS[id]} label={tr(`الحوض ${id}`, `Basin ${id}`)} />
        ))}
        <LegendItem color={COLORS.danger} label={tr(`حد تحمّل النخيل ${threshold} dS/m`, `Date-palm tolerance ${threshold} dS/m`)} dashed />
        {above.length > 0 && (
          <span className="ms-auto flex items-center gap-1 rounded-full bg-[#FBE7E5] px-2 py-0.5 text-[11px] font-semibold text-pn-danger">
            <TriangleAlert size={12} /> {tr("فوق الحد:", "Above limit:")} {above.map((b) => b.id).join(tr("، ", ", "))}
          </span>
        )}
      </div>
      <div dir="ltr" className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
            onClick={(e) => {
              const d = dayFromClick(e, 0);
              if (d) onSelectDay(d);
            }}
            className="cursor-pointer"
          >
            <CartesianGrid vertical={false} stroke={GRID} />
            <ReferenceArea y1={threshold} y2={yMax} fill={COLORS.danger} fillOpacity={0.05} />
            <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis domain={[0, yMax]} tick={AXIS} axisLine={false} tickLine={false} />
            <ReferenceLine y={threshold} stroke={COLORS.danger} strokeDasharray="6 4" strokeWidth={1.5} />
            <ReferenceLine x={dayName(selectedDay)} stroke="#2699C7" strokeOpacity={0.35} strokeWidth={8} />
            <Tooltip
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={`${label} · ECe`}
                    rows={IDS.map((id) => ({ label: tr(`الحوض ${id}`, `Basin ${id}`), value: Number(payload[0].payload[id]), unit: "dS/m", color: BASIN_COLORS[id], digits: 2 }))}
                    footer={`${tr("ملوحة مياه الري", "Irrigation water")} ECw = ${fmt(result.inputs.ecw)} dS/m`}
                  />
                ) : null
              }
            />
            {IDS.map((id) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                stroke={BASIN_COLORS[id]}
                strokeWidth={2.5}
                dot={(props) => {
                  const { cx, cy, value, index } = props as { cx: number; cy: number; value: number; index: number };
                  const warn = value > threshold;
                  return (
                    <circle
                      key={`${id}-${index}`}
                      cx={cx}
                      cy={cy}
                      r={warn ? 3.5 : 3}
                      fill={warn ? "#fff" : BASIN_COLORS[id]}
                      stroke={warn ? COLORS.danger : "none"}
                      strokeWidth={warn ? 2 : 0}
                    />
                  );
                }}
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
