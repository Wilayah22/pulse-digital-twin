"use client";

import {
  BrainCircuit,
  CalendarClock,
  CircleCheck,
  CloudRain,
  Download,
  Droplets,
  FlaskConical,
  Hourglass,
  Lightbulb,
  PlugZap,
  Scale,
  ShieldAlert,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { Recommendation, SimulationResult } from "../engine";
import { useSimulation } from "../state/SimulationProvider";
import { Card, CardHeader, Skeleton } from "./ui";

const KIND_ICON: Record<Recommendation["kind"], LucideIcon> = {
  priority: Droplets,
  defer: Hourglass,
  limit: Scale,
  schedule: CalendarClock,
  rain: CloudRain,
  leaching: FlaskConical,
  "no-leaching": ShieldAlert,
  delay: CalendarClock,
  outage: PlugZap,
  saving: CircleCheck,
};

const SEVERITY: Record<Recommendation["severity"], { color: string; soft: string }> = {
  critical: { color: "#DC5B52", soft: "#FBE7E5" },
  warning: { color: "#B7862F", soft: "#FAF0DA" },
  info: { color: "#2699C7", soft: "#E3F3FA" },
  success: { color: "#176B50", soft: "#E6F4EC" },
};

function toCsv(r: SimulationResult): string {
  const header = ["strategy", "day", "date", "basin", "moisture_before_pct", "moisture_after_pct", "irrigation_m3", "leaching_m3", "ece_end_dSm", "et0_mm", "etc_mm", "deep_percolation_mm", "priority_score"];
  const lines = [header.join(",")];
  for (const s of [r.pulse, r.traditional]) {
    for (const b of s.basins) {
      b.days.forEach((d, i) => {
        lines.push(
          [
            s.strategy,
            d.day,
            r.timeline[i].date,
            b.id,
            d.moistureBefore.toFixed(1),
            d.moistureAfter.toFixed(1),
            d.irrigationVolume.toFixed(2),
            d.leachingVolume.toFixed(2),
            d.eceEnd.toFixed(3),
            r.weather.days[i].et0.toFixed(2),
            d.etc.toFixed(2),
            d.deepPercolation.toFixed(1),
            d.priorityScore.toFixed(3),
          ].join(","),
        );
      });
    }
  }
  return lines.join("\n");
}

function downloadReport(r: SimulationResult) {
  const meta = [
    `# Pulse simulation report`,
    `# weather_source=${r.weather.source}, available_water_m3=${r.inputs.availableWater}, ecw_dSm=${r.inputs.ecw}, delay_h=${r.inputs.delayHours}, outage_from_day=${r.inputs.outageFromDay}, kc=${r.inputs.kc}`,
    `# pulse_total_m3=${r.pulse.totalUsed.toFixed(2)}, traditional_total_m3=${r.traditional.totalUsed.toFixed(2)}`,
  ].join("\n");
  const blob = new Blob([`﻿${meta}\n${toCsv(r)}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `pulse-simulation-${r.timeline[0].date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function RecommendationPanel() {
  const { result } = useSimulation();
  return (
    <Card id="report" className="pb-4">
      <CardHeader
        title="التوصية الذكية"
        icon={<Lightbulb size={18} />}
        subtitle="مستخرجة من نتائج المحاكاة المحسوبة — لا توصيات ثابتة"
        action={
          result && (
            <button
              type="button"
              onClick={() => downloadReport(result)}
              className="flex items-center gap-1.5 rounded-lg border border-pn-line px-2.5 py-1.5 text-[11px] font-semibold text-pn-navy hover:border-pn-forest/40"
            >
              <Download size={13} /> تصدير التقرير CSV
            </button>
          )
        }
      />
      <div className="mt-3 space-y-2.5 px-4">
        {!result
          ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)
          : result.recommendations.length === 0
            ? <p className="py-6 text-center text-sm text-pn-muted">لا توجد إجراءات مطلوبة في هذا السيناريو.</p>
            : result.recommendations.map((rec, i) => {
                const Icon = KIND_ICON[rec.kind];
                const sev = SEVERITY[rec.severity];
                return (
                  <article
                    key={rec.id}
                    className={`rounded-xl border p-3 ${i === 0 ? "border-transparent bg-gradient-to-l from-pn-navy to-pn-deep text-white" : "border-pn-line bg-white"}`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
                        style={i === 0 ? { backgroundColor: "rgba(217,164,65,0.2)", color: "#D9A441" } : { backgroundColor: sev.soft, color: sev.color }}
                      >
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className={`text-sm font-bold ${i === 0 ? "text-white" : "text-pn-navy"}`}>{rec.action}</h3>
                        <p className={`mt-0.5 text-xs leading-5 ${i === 0 ? "text-white/80" : "text-pn-ink/80"}`}>
                          <span className={`font-semibold ${i === 0 ? "text-pn-gold" : ""}`}>السبب: </span>
                          {rec.reason}
                        </p>
                        {(rec.allocation || rec.impact) && (
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                            {rec.allocation && (
                              <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 ${i === 0 ? "bg-white/10 text-white" : "bg-[#E3F3FA] text-[#1b6f93]"}`}>
                                <Droplets size={11} /> {rec.allocation}
                              </span>
                            )}
                            {rec.impact && (
                              <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 ${i === 0 ? "bg-white/10 text-white" : "bg-[#E6F4EC] text-pn-forest"}`}>
                                <TrendingUp size={11} /> {rec.impact}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
      </div>
    </Card>
  );
}

export function DecisionFactors() {
  const { result, applied } = useSimulation();
  const weatherLabel =
    result?.weather.source === "open-meteo" ? "Open-Meteo (حي)" : result?.weather.source === "custom" ? "سيناريو مخصص" : "سيناريو تجريبي";
  const factors = [
    { label: "استنزاف ماء التربة لكل حوض", weight: "65%" },
    { label: "الطلب المائي ETc = Kc × ET0", weight: "15%" },
    { label: "ملوحة التربة ECe مقابل حد التحمّل", weight: "20%" },
    { label: `المياه المتاحة في الخزان (${applied.availableWater} م³)`, weight: "قيد" },
    { label: `توقعات الطقس 7 أيام — ${weatherLabel}`, weight: "تنبؤ" },
    { label: `تأخر المناوبة (${applied.delayHours} ساعة) وانقطاع الإمداد`, weight: "قيد" },
  ];
  return (
    <Card className="pb-4">
      <CardHeader title="لماذا هذا القرار؟" icon={<BrainCircuit size={18} />} subtitle="العوامل التي يزنها محرك التوزيع يومياً" />
      <ul className="mt-3 space-y-2 px-5">
        {factors.map((f) => (
          <li key={f.label} className="flex items-center justify-between gap-2 text-xs text-pn-ink">
            <span className="flex items-center gap-2">
              <CircleCheck size={14} className="shrink-0 text-pn-green" />
              {f.label}
            </span>
            <span className="num rounded-md bg-pn-bg px-1.5 py-0.5 text-[10px] font-semibold text-pn-muted">{f.weight}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
