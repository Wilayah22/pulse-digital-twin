"use client";

import { Droplets, FlaskConical, Sprout, Waves } from "lucide-react";
import { CROP } from "../engine";
import { useSimulation } from "../state/SimulationProvider";
import { basinDayViews } from "../state/selectors";
import { BasinAvatar, Card, CardHeader, Chip, HEALTH_META, PRIORITY_META, Skeleton, fmt } from "./ui";

export function BasinStatusPanel() {
  const { result, selectedDay, strategy, selectedBasin, setSelectedBasin } = useSimulation();
  return (
    <Card id="basins" className="pb-4">
      <CardHeader
        title="حالة الأحواض"
        icon={<Sprout size={18} />}
        subtitle={
          <>
            اليوم {selectedDay} · {strategy === "pulse" ? "قرارات Pulse" : "الري التقليدي"}
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
                        <span className="font-bold text-pn-navy">{v.name}</span>
                        <Chip color={prio.color} soft={prio.soft}>
                          أولوية {prio.label}
                        </Chip>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1.5 text-[11px]" style={{ color: health.color }}>
                        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: health.color }} />
                        {health.label}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2.5">
                    <div className="mb-1 flex items-center justify-between text-[11px] text-pn-muted">
                      <span className="flex items-center gap-1">
                        <Droplets size={12} className="text-pn-water" /> رطوبة التربة
                      </span>
                      <span className="num font-semibold text-pn-navy">
                        {fmt(v.moistureBefore, 0)}%{v.irrigation > 1e-6 && <span className="text-pn-forest"> ← {fmt(v.moistureAfter, 0)}%</span>}
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
                        title="حد الإجهاد (RAW)"
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
                        <Waves size={11} /> اليوم
                      </div>
                      <div className="num font-bold text-pn-water">{fmt(v.irrigation)} م³</div>
                    </div>
                    <div className="rounded-lg bg-pn-bg px-1 py-1.5">
                      <div className="text-pn-muted">إجمالي 7 أيام</div>
                      <div className="num font-bold text-pn-navy">{fmt(v.totalAllocated)} م³</div>
                    </div>
                  </div>
                </button>
              );
            })}
      </div>
    </Card>
  );
}
