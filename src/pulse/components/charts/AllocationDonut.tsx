"use client";

import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Sector, Tooltip, type PieSectorShapeProps } from "recharts";
import type { SimulationResult } from "../../engine";
import { useLang } from "../../i18n/LanguageProvider";
import { BASIN_COLORS, fmt } from "../ui";
import { TooltipCard } from "./shared";

const RESERVE_COLOR = "#E3E7E2";

export function AllocationDonut({ result }: { result: SimulationResult }) {
  const { t, dir } = useLang();
  const [hover, setHover] = useState<number | null>(null);
  const total = result.inputs.availableWater;
  const m3 = t("م³", "m³");
  const slices = [
    ...result.pulse.basins.map((b) => ({ key: b.id, name: t(`الحوض ${b.id}`, `Basin ${b.id}`), value: b.totalIrrigation, color: BASIN_COLORS[b.id] })),
    {
      key: "reserve",
      name: result.inputs.outageFromDay > 0 ? t("غير مستخدم / لم يصل", "Unused / not delivered") : t("متبقٍ في الخزان", "Left in reservoir"),
      value: Math.max(0, total - result.pulse.totalUsed),
      color: RESERVE_COLOR,
    },
  ];
  const used = result.pulse.totalUsed;

  return (
    <div className="pn-donut flex flex-col items-center gap-4 sm:flex-row lg:flex-col">
      <div dir="ltr" className="relative h-[200px] w-[200px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={64}
              outerRadius={88}
              paddingAngle={3}
              cornerRadius={6}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              animationDuration={800}
              onMouseEnter={(_, i) => setHover(i)}
              onMouseLeave={() => setHover(null)}
              shape={(props: PieSectorShapeProps & { index?: number }) => (
                <Sector {...props} outerRadius={props.index === hover ? Number(props.outerRadius) + 6 : props.outerRadius} />
              )}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <TooltipCard
                    title={String(payload[0].name)}
                    rows={[
                      {
                        label: t("الحجم", "Volume"),
                        value: Number(payload[0].value),
                        unit: `${m3} (${fmt((100 * Number(payload[0].value)) / total, 0)}%)`,
                        color: String(payload[0].payload.color),
                      },
                    ]}
                  />
                ) : null
              }
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" dir={dir}>
          <span className="text-[10px] font-medium text-pn-muted">{t("المستخدم", "Used")}</span>
          <span className="num text-[26px] leading-tight font-bold text-pn-navy">{fmt(used)}</span>
          <span className="text-[10px] text-pn-muted">
            {t("من", "of")} <span className="num font-semibold">{fmt(total, 0)}</span> {m3}
          </span>
        </div>
      </div>
      <ul className="w-full space-y-2.5 text-xs">
        {slices.map((s, i) => {
          const pct = total > 0 ? (100 * s.value) / total : 0;
          return (
            <li
              key={s.key}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className={`rounded-lg px-1.5 py-1 transition-colors ${hover === i ? "bg-pn-bg" : ""}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-pn-ink">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.key === "reserve" ? "#C3CBC4" : s.color }} />
                  {s.name}
                </span>
                <span className="flex items-baseline gap-1.5">
                  <span className="num font-bold text-pn-navy">{fmt(s.value)}</span>
                  <span className="text-[10px] text-pn-muted">{m3}</span>
                  <span className="num w-9 text-end text-[11px] font-semibold text-pn-muted">{fmt(pct, 0)}%</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-pn-bg">
                <div
                  className="h-full rounded-full transition-[width] duration-700"
                  style={{ width: `${pct}%`, backgroundColor: s.key === "reserve" ? "#C3CBC4" : s.color }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
