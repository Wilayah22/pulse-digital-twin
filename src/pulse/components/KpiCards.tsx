"use client";

import { ArrowDown, ArrowUp, Droplets, FlaskConical, Leaf, Sprout } from "lucide-react";
import { percentChange, waterSavingPercent } from "../engine";
import { useSimulation } from "../state/SimulationProvider";
import { AnimatedNumber, InfoTip, Skeleton, fmt } from "./ui";

interface Kpi {
  key: string;
  title: string;
  tip: string;
  value: number;
  digits: number;
  unit: string;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  delta: number;
  deltaUnit: string;
  /** Whether a positive delta is good for the farm. */
  higherIsBetter: boolean;
  note: string;
}

function KpiCard({ k }: { k: Kpi }) {
  const neutral = Math.abs(k.delta) < 0.05;
  const good = neutral ? null : (k.delta > 0) === k.higherIsBetter;
  const color = good === null ? "#718096" : good ? "#38A169" : "#DC5B52";
  const Arrow = k.delta >= 0 ? ArrowUp : ArrowDown;
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-pn-line bg-white p-4 shadow-[0_1px_2px_rgba(16,42,56,0.04),0_8px_24px_-12px_rgba(16,42,56,0.12)] transition-shadow hover:shadow-md"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: k.iconBg, color: k.iconColor }}>
        {k.icon}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 text-xs font-semibold text-pn-navy/80">
          {k.title}
          <InfoTip text={k.tip} />
        </div>
        <div className="mt-1 flex items-baseline gap-1.5 text-pn-navy">
          <AnimatedNumber value={k.value} digits={k.digits} className="text-[28px] leading-none font-bold" />
          <span className="text-sm font-medium text-pn-muted">{k.unit}</span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px]">
          <span className="flex items-center gap-0.5 font-semibold" style={{ color }}>
            {!neutral && <Arrow size={12} />}
            <span className="num">
              {k.delta > 0 ? "+" : ""}
              {fmt(k.delta, 1)}
              {k.deltaUnit}
            </span>
          </span>
          <span className="text-pn-muted">{k.note}</span>
        </div>
      </div>
    </div>
  );
}

export function KpiCards() {
  const { result } = useSimulation();
  if (!result) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[110px]" />
        ))}
      </div>
    );
  }
  const { pulse: p, traditional: t } = result;
  const saved = t.totalUsed - p.totalUsed;
  const kpis: Kpi[] = [
    {
      key: "used",
      title: "إجمالي المياه المستخدمة",
      tip: "مجموع المياه التي وزّعها Pulse على الأحواض الثلاثة خلال 7 أيام.",
      value: p.totalUsed,
      digits: 1,
      unit: "م³",
      icon: <Droplets size={22} />,
      iconBg: "#E3F3FA",
      iconColor: "#2699C7",
      delta: percentChange(p.totalUsed, t.totalUsed),
      deltaUnit: "%",
      higherIsBetter: false,
      note: `مقارنة بالري التقليدي (${fmt(t.totalUsed)} م³)`,
    },
    {
      key: "saving",
      title: "نسبة توفير المياه",
      tip: "(استهلاك التقليدي − استهلاك Pulse) ÷ استهلاك التقليدي، تحت نفس الطقس ونفس كمية المياه المتاحة.",
      value: waterSavingPercent(result),
      digits: 1,
      unit: "%",
      icon: <Leaf size={22} />,
      iconBg: "#E6F4EC",
      iconColor: "#38A169",
      delta: saved,
      deltaUnit: " م³",
      higherIsBetter: true,
      note: "من إجمالي استهلاك الري التقليدي",
    },
    {
      key: "moisture",
      title: "متوسط رطوبة التربة",
      tip: "متوسط الماء المتاح في منطقة الجذور (% من TAW) لكل الأحواض والأيام. 100% = السعة الحقلية.",
      value: p.avgMoisture,
      digits: 0,
      unit: "%",
      icon: <Sprout size={22} />,
      iconBg: "#E6F4EC",
      iconColor: "#176B50",
      delta: p.avgMoisture - t.avgMoisture,
      deltaUnit: " نقطة",
      higherIsBetter: true,
      note: `أيام إجهاد: ${p.stressDays} مقابل ${t.stressDays} تقليدياً`,
    },
    {
      key: "ece",
      title: "متوسط ملوحة التربة",
      tip: "متوسط ECe المتوقع في نهاية الفترة. يتأثر بملوحة مياه الري (ECw) والتسرب العميق الذي يغسل الأملاح.",
      value: p.avgEce,
      digits: 2,
      unit: "dS/m",
      icon: <FlaskConical size={22} />,
      iconBg: "#FAF0DA",
      iconColor: "#B7862F",
      delta: percentChange(p.avgEce, t.avgEce),
      deltaUnit: "%",
      higherIsBetter: false,
      note: `مقارنة بالري التقليدي (${fmt(t.avgEce, 2)})`,
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-4">
      {kpis.map((k) => (
        <KpiCard key={k.key} k={k} />
      ))}
    </div>
  );
}
