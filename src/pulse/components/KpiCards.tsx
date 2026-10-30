"use client";

import { ArrowDown, ArrowUp, Droplets, FlaskConical, Leaf, Sprout } from "lucide-react";
import { percentChange, waterSavingPercent } from "../engine";
import { useLang } from "../i18n/LanguageProvider";
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
  const { t: tr } = useLang();
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
      title: tr("إجمالي المياه المستخدمة", "Total water used"),
      tip: tr("مجموع المياه التي وزّعها Pulse على الأحواض الثلاثة خلال 7 أيام.", "Water Pulse delivered to the three basins over 7 days."),
      value: p.totalUsed,
      digits: 1,
      unit: tr("م³", "m³"),
      icon: <Droplets size={22} />,
      iconBg: "#E3F3FA",
      iconColor: "#2699C7",
      delta: percentChange(p.totalUsed, t.totalUsed),
      deltaUnit: "%",
      higherIsBetter: false,
      note: tr(`مقارنة بالري التقليدي (${fmt(t.totalUsed)} م³)`, `vs traditional irrigation (${fmt(t.totalUsed)} m³)`),
    },
    {
      key: "saving",
      title: tr("نسبة توفير المياه", "Water saving"),
      tip: tr(
        "(استهلاك التقليدي − استهلاك Pulse) ÷ استهلاك التقليدي، تحت نفس الطقس ونفس كمية المياه المتاحة.",
        "(Traditional use − Pulse use) ÷ traditional use, under the same weather and the same available water.",
      ),
      value: waterSavingPercent(result),
      digits: 1,
      unit: "%",
      icon: <Leaf size={22} />,
      iconBg: "#E6F4EC",
      iconColor: "#38A169",
      delta: saved,
      deltaUnit: tr(" م³", " m³"),
      higherIsBetter: true,
      note: tr("من إجمالي استهلاك الري التقليدي", "of traditional irrigation use"),
    },
    {
      key: "moisture",
      title: tr("متوسط رطوبة التربة", "Average soil moisture"),
      tip: tr(
        "متوسط الماء المتاح في منطقة الجذور (% من TAW) لكل الأحواض والأيام. 100% = السعة الحقلية.",
        "Mean root-zone available water (% of TAW) across basins and days. 100% = field capacity.",
      ),
      value: p.avgMoisture,
      digits: 0,
      unit: "%",
      icon: <Sprout size={22} />,
      iconBg: "#E6F4EC",
      iconColor: "#176B50",
      delta: p.avgMoisture - t.avgMoisture,
      deltaUnit: tr(" نقطة", " pts"),
      higherIsBetter: true,
      note: tr(`أيام إجهاد: ${p.stressDays} مقابل ${t.stressDays} تقليدياً`, `Stress days: ${p.stressDays} vs ${t.stressDays} traditional`),
    },
    {
      key: "ece",
      title: tr("متوسط ملوحة التربة", "Average soil salinity"),
      tip: tr(
        "متوسط ECe المتوقع في نهاية الفترة. يتأثر بملوحة مياه الري (ECw) والتسرب العميق الذي يغسل الأملاح.",
        "Mean predicted ECe at the end of the period, driven by irrigation-water salinity (ECw) and salt-flushing deep percolation.",
      ),
      value: p.avgEce,
      digits: 2,
      unit: "dS/m",
      icon: <FlaskConical size={22} />,
      iconBg: "#FAF0DA",
      iconColor: "#B7862F",
      delta: percentChange(p.avgEce, t.avgEce),
      deltaUnit: "%",
      higherIsBetter: false,
      note: tr(`مقارنة بالري التقليدي (${fmt(t.avgEce, 2)})`, `vs traditional (${fmt(t.avgEce, 2)})`),
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
