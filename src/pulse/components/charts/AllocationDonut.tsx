"use client";

import { useLang } from "../../i18n/LanguageProvider";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import type { SimulationResult } from "../../engine";
import { BASIN_COLORS, fmt } from "../ui";
import { TooltipCard } from "./shared";

const RESERVE_COLOR = "#D9DED9";

export function AllocationDonut({ result }: { result: SimulationResult }) {
  const { t, dir } = useLang();
  const total = result.inputs.availableWater;
  const slices = [
    ...result.pulse.basins.map((b) => ({ key: b.id, name: t(`الحوض ${b.id}`, `Basin ${b.id}`), value: b.totalIrrigation, color: BASIN_COLORS[b.id] })),
    {
      key: "reserve",
      name: result.inputs.outageFromDay > 0 ? t("غير مستخدم / لم يصل", "Unused / not delivered") : t("متبقٍ في الخزان", "Left in reservoir"),
      value: Math.max(0, total - result.pulse.totalUsed),
      color: RESERVE_COLOR,
    },
  ];
  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row lg:flex-col">
      <div dir="ltr" className="relative h-[190px] w-[190px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={2}
              startAngle={90}
              endAngle={-270}
              stroke="none"
              animationDuration={700}
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
                        unit: `${t("م³", "m³")} (${fmt((100 * Number(payload[0].value)) / total, 0)}%)`,
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
          <span className="num text-2xl font-bold text-pn-navy">{fmt(total, 0)}</span>
          <span className="text-[11px] text-pn-muted">{t("م³ إجمالي المتاح", "m³ available")}</span>
        </div>
      </div>
      <ul className="w-full space-y-1.5 text-xs">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-pn-ink">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
            <span className="flex items-baseline gap-2">
              <span className="num font-bold text-pn-navy">{fmt(s.value)}</span>
              <span className="text-pn-muted">{t("م³", "m³")}</span>
              <span className="num w-10 text-end text-pn-muted">{fmt((100 * s.value) / total, 0)}%</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
