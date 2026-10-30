"use client";

import { TriangleAlert } from "lucide-react";
import { useId, useState } from "react";
import { Area, CartesianGrid, ComposedChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CROP, type BasinId, type SimulationResult } from "../../engine";
import { useLang } from "../../i18n/LanguageProvider";
import { BASIN_COLORS, COLORS, fmt } from "../ui";
import { AXIS, GRID_PROPS, Gradient, LegendToggle, SELECTED_BAND, TooltipCard, dayFromClick } from "./shared";

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
  const uid = useId().replace(/:/g, "");
  const [shown, setShown] = useState<Record<BasinId, boolean>>({ A: true, B: true, C: true });
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
  const yMax = Math.ceil(Math.max(threshold + 1.5, ...values) + 0.5);
  const yMin = Math.max(0, Math.floor(Math.min(...values) - 1));
  const above = s.basins.filter((b) => b.days[b.days.length - 1].eceEnd > threshold);
  const visible = IDS.filter((id) => shown[id]);
  const last = data.length - 1;

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-1.5 px-1">
        {IDS.map((id) => (
          <LegendToggle
            key={id}
            color={BASIN_COLORS[id]}
            label={tr(`الحوض ${id}`, `Basin ${id}`)}
            active={shown[id]}
            onToggle={() => setShown((x) => ({ ...x, [id]: !x[id] }))}
          />
        ))}
        {above.length > 0 && (
          <span className="ms-auto flex items-center gap-1 rounded-full bg-[#FBE7E5] px-2.5 py-1 text-[11px] font-semibold text-pn-danger">
            <TriangleAlert size={12} /> {tr("فوق حد التحمّل:", "Above tolerance:")} {above.map((b) => b.id).join(tr("، ", ", "))}
          </span>
        )}
      </div>
      <div dir="ltr" className="h-[270px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 10, right: 38, left: 0, bottom: 0 }}
            onClick={(e) => {
              const d = dayFromClick(e, 0);
              if (d) onSelectDay(d);
            }}
            className="cursor-pointer"
          >
            <defs>
              {IDS.map((id) => (
                <Gradient key={id} id={`${uid}-${id}`} color={BASIN_COLORS[id]} from={0.09} to={0} />
              ))}
            </defs>
            <CartesianGrid {...GRID_PROPS} />
            <ReferenceArea y1={threshold} y2={yMax} fill={COLORS.danger} fillOpacity={0.05} strokeOpacity={0} />
            <ReferenceLine
              y={threshold}
              stroke={COLORS.danger}
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: tr(`حد تحمّل النخيل ${threshold} dS/m`, `Date-palm tolerance ${threshold} dS/m`),
                position: "insideTopLeft",
                fontSize: 10,
                fill: COLORS.danger,
              }}
            />
            <ReferenceArea x1={dayName(selectedDay)} x2={dayName(selectedDay)} {...SELECTED_BAND} />
            <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} dy={6} interval="preserveStartEnd" />
            <YAxis domain={[yMin, yMax]} tick={AXIS} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              cursor={{ stroke: "#CBD2D9", strokeDasharray: "3 3" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={`${label} · ECe`}
                    rows={visible.map((id) => ({
                      label: tr(`الحوض ${id}`, `Basin ${id}`),
                      value: Number(payload[0].payload[id]),
                      unit: "dS/m",
                      color: BASIN_COLORS[id],
                      digits: 2,
                    }))}
                    footer={`${tr("ملوحة مياه الري", "Irrigation water")} ECw = ${fmt(result.inputs.ecw)} dS/m`}
                  />
                ) : null
              }
            />
            {visible.map((id) => (
              <Area
                key={id}
                type="monotone"
                dataKey={id}
                stroke={BASIN_COLORS[id]}
                strokeWidth={2.5}
                fill={`url(#${uid}-${id})`}
                baseValue={yMin}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
                animationDuration={800}
                label={(props: { index?: number; x?: number | string; y?: number | string; value?: unknown }) =>
                  props.index === last ? (
                    <text
                      key={`${id}-end`}
                      x={Number(props.x) + 6}
                      y={Number(props.y) + 4}
                      fontSize={11}
                      fontWeight={700}
                      fill={Number(props.value) > threshold ? COLORS.danger : BASIN_COLORS[id]}
                    >
                      {fmt(Number(props.value), 2)}
                    </text>
                  ) : (
                    <g key={`${id}-${props.index}`} />
                  )
                }
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
