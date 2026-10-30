"use client";

import { Droplets, FlaskConical, Sprout, Waves } from "lucide-react";
import { CROP } from "../engine";
import { useSimulation } from "../state/SimulationProvider";
import { useLang } from "../i18n/LanguageProvider";
import { basinDayViews } from "../state/selectors";
import { BasinAvatar, Card, CardHeader, Chip, HEALTH_META, PRIORITY_META, Skeleton, fmt } from "./ui";

export function BasinStatusPanel() {
  const { result, selectedDay, strategy, selectedBasin, setSelectedBasin } = useSimulation();
  const { t, arrow } = useLang();
  return (
    <Card id="basins" className="pb-4">
      <CardHeader
        title={t("حالة الأحواض", "Basin status")}
        icon={<Sprout size={18} />}
        subtitle={
          <>
            {t(`اليوم ${selectedDay}`, `Day ${selectedDay}`)} · {strategy === "pulse" ? t("قرارات Pulse", "Pulse decisions") : t("الري التقليدي", "Traditional irrigation")}
          </>
        }
      />
      <div className="mt-3 space-y-2.5 px-4">
        {!result
          ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[118px]" />)
          : basinDayViews(result, strategy, selectedDay).map((v) => {
              const health = HEALTH_META[v.health];
              const prio = PRIORITY_META[v.priority];
              const on = selectedBasin === v.id;
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setSelectedBasin(on ? null : v.id);
                    if (!on) document.getElementById("twin")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`w-full rounded-xl border p-3 text-start transition-all ${
                    on ? "border-pn-water bg-[#F2FAFD] ring-2 ring-pn-water/20" : "border-pn-line bg-white hover:border-pn-forest/30 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <BasinAvatar id={v.id} size={38} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-pn-navy">{t(`الحوض ${v.id}`, `Basin ${v.id}`)}</span>
                        <Chip color={prio.color} soft={prio.soft}>
                          {t(`أولوية ${prio.label}`, `${prio.labelEn} priority`)}
                        </Chip>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px]" style={{ color: health.color }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: health.color }} />
                        {t(health.label, health.labelEn)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-pn-muted">
                      <span className="flex items-center gap-1">
                        <Droplets size={12} className="text-pn-water" /> {t("رطوبة التربة", "Soil moisture")}
                      </span>
                      <span className="num font-semibold text-pn-navy">
                        {fmt(v.moistureBefore, 0)}%{v.irrigation > 1e-6 && <span className="text-pn-forest"> {arrow} {fmt(v.moistureAfter, 0)}%</span>}
                      </span>
                    </div>
                    <div className="relative h-2 overflow-hidden rounded-full bg-pn-bg">
                      <div
                        className="absolute inset-y-0 start-0 rounded-full opacity-35 transition-[width] duration-700 ease-out"
                        style={{ width: `${v.moistureAfter}%`, backgroundColor: health.color }}
                      />
                      <div
                        className="absolute inset-y-0 start-0 rounded-full transition-[width] duration-700 ease-out"
                        style={{ width: `${v.moistureBefore}%`, backgroundColor: health.color }}
                      />
                      <div
                        className="absolute inset-y-0 w-0.5 bg-pn-navy/40"
                        style={{ insetInlineStart: `${100 * (1 - v.raw / v.taw)}%` }}
                        title={t("حد الإجهاد (RAW)", "Stress threshold (RAW)")}
                      />
                    </div>
                  </div>

                  <div className="mt-2.5 grid grid-cols-3 gap-2 text-center text-[11px]">
                    <div className="rounded-lg bg-pn-bg px-1 py-1.5">
                      <div className="flex items-center justify-center gap-1 text-pn-muted">
                        <FlaskConical size={11} /> ECe
                      </div>
                      <div className="num font-bold" style={{ color: v.eceEnd > CROP.eceThreshold ? "#DC5B52" : "#102A38" }}>
                        {fmt(v.eceEnd, 2)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-pn-bg px-1 py-1.5">
                      <div className="flex items-center justify-center gap-1 text-pn-muted">
                        <Waves size={11} /> {t("اليوم", "Today")}
                      </div>
                      <div className="num font-bold text-pn-water">{fmt(v.irrigation)} {t("م³", "m³")}</div>
                    </div>
                    <div className="rounded-lg bg-pn-bg px-1 py-1.5">
                      <div className="text-pn-muted">{t("إجمالي 7 أيام", "7-day total")}</div>
                      <div className="num font-bold text-pn-navy">{fmt(v.totalAllocated)} {t("م³", "m³")}</div>
                    </div>
                  </div>
                </button>
              );
            })}
      </div>
    </Card>
  );
}
