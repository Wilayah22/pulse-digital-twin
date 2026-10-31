"use client";

import { ChevronLeft, ChevronRight, Timer } from "lucide-react";
import type { BasinId, ScheduledPulse, SimulationResult } from "../../engine";
import { useLang } from "../../i18n/LanguageProvider";
import { BASIN_COLORS, fmt } from "../ui";
import { StatChip } from "./shared";

const IDS: BasinId[] = ["A", "B", "C"];

function clock(min: number) {
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

/** Order in which basins are served, collapsing consecutive pulses of the same basin. */
function order(events: ScheduledPulse[]) {
  return events.map((e) => e.basin).filter((b, i, a) => i === 0 || a[i - 1] !== b);
}

function Lane({
  title,
  events,
  span,
  delayMin,
  t,
}: {
  title: string;
  events: ScheduledPulse[];
  span: number;
  delayMin: number;
  t: (ar: string, en: string) => string;
}) {
  const x = (m: number) => `${(100 * m) / span}%`;
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-bold text-pn-navy">{title}</div>
      <div className="space-y-1.5">
        {IDS.map((id) => {
          const mine = events.filter((e) => e.basin === id);
          return (
            <div key={id} className="flex items-center gap-2">
              <span className="w-12 shrink-0 text-[11px] font-semibold text-pn-muted">{t(`الحوض ${id}`, `Basin ${id}`)}</span>
              <div dir="ltr" className="relative h-6 flex-1 overflow-hidden rounded-md bg-[#F2F3EF]">
                {delayMin > 0 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-[repeating-linear-gradient(135deg,#E6E8E3_0_6px,#F2F3EF_6px_12px)]"
                    style={{ width: x(delayMin) }}
                  />
                )}
                {mine.map((e) => (
                  <div key={`${e.basin}-${e.index}`}>
                    {/* soaking after the valve closes */}
                    {e.soakEnd > e.end + 0.5 && (
                      <div className="absolute inset-y-1 rounded-sm opacity-30" style={{ left: x(e.end), width: x(e.soakEnd - e.end), backgroundColor: BASIN_COLORS[id] }} />
                    )}
                    <div
                      className="absolute inset-y-0.5 flex items-center justify-center rounded-[5px] text-[10px] font-bold text-white shadow-sm"
                      style={{
                        left: x(e.start),
                        width: `max(${x(e.end - e.start)}, 3px)`,
                        background: e.leaching
                          ? `repeating-linear-gradient(135deg, #D9A441 0 5px, #C58F2E 5px 10px)`
                          : BASIN_COLORS[id],
                      }}
                      title={`${t(`الحوض ${id}`, `Basin ${id}`)} · ${e.leaching ? t("نبضة غسيل", "leaching pulse") : t(`نبضة ${e.index + 1}`, `pulse ${e.index + 1}`)} · ${clock(e.start)}–${clock(e.end)} · ${fmt(e.volumeM3)} ${t("م³", "m³")}`}
                    >
                      {e.end - e.start > span * 0.05 ? (e.leaching ? t("غسيل", "leach") : e.index + 1) : ""}
                    </div>
                  </div>
                ))}
                {mine.length === 0 && (
                  <span className="absolute inset-0 flex items-center justify-center text-[10px] text-pn-muted">{t("الصمام مغلق", "valve closed")}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Valve schedule on the shared source for the selected day: Pulse interleaves short Green-Ampt pulses in
 * priority order (a basin rests while the next one is served), traditional rotation floods basins in turn.
 */
export function PulseSchedule({ result, selectedDay }: { result: SimulationResult; selectedDay: number }) {
  const { t, dir } = useLang();
  const Next = dir === "rtl" ? ChevronLeft : ChevronRight;
  const i = Math.max(0, Math.min(selectedDay - 1, result.pulse.schedules.length - 1));
  const p = result.pulse.schedules[i];
  const tr = result.traditional.schedules[i];
  const delayMin = i === 0 ? result.inputs.delayHours * 60 : 0;
  const lastEnd = Math.max(1, ...p.map((e) => e.soakEnd), ...tr.map((e) => e.soakEnd), delayMin + 30);
  const step = lastEnd > 360 ? 60 : 30;
  const span = Math.ceil(lastEnd / step) * step;
  const ticks = Array.from({ length: span / step + 1 }, (_, k) => k * step);
  const valveMin = (ev: ScheduledPulse[]) => ev.reduce((a, e) => a + e.end - e.start, 0);
  const seq = order(p);
  const pulses = p.filter((e) => !e.leaching).length;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        <StatChip label={t("نبضات Pulse", "Pulse pulses")} value={`${pulses}${p.some((e) => e.leaching) ? ` + ${t("غسيل", "leach")}` : ""}`} tone="good" />
        <StatChip label={t("زمن فتح الصمامات", "Valve-open time")} value={`${fmt(valveMin(p), 0)} ${t("د", "min")}`} />
        <StatChip label={t("تقليدي", "Traditional")} value={`${tr.length} ${t("غمر", "floods")} · ${fmt(valveMin(tr), 0)} ${t("د", "min")}`} />
        {seq.length > 0 && (
          <span className="ms-auto flex items-center gap-1.5 rounded-lg bg-pn-navy px-2.5 py-1 text-[11px] font-semibold text-white">
            <Timer size={12} /> {t("الترتيب:", "Order:")}
            {seq.map((b, k) => (
              <span key={k} className="flex items-center gap-1">
                {k > 0 && <Next size={12} className="text-white/60" />}
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold" style={{ backgroundColor: BASIN_COLORS[b as BasinId] }}>
                  {b}
                </span>
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="space-y-4">
        <Lane title={t("Pulse — نبضات قصيرة بالتناوب حسب الأولوية", "Pulse: short pulses, interleaved by priority")} events={p} span={span} delayMin={delayMin} t={t} />
        <Lane title={t("الري التقليدي — غمر متواصل بترتيب ثابت", "Traditional: continuous flooding in fixed order")} events={tr} span={span} delayMin={delayMin} t={t} />
      </div>
      <div dir="ltr" className="relative mt-1.5 ms-14 h-4 text-[10px] text-pn-muted">
        {ticks.map((m) => (
          <span key={m} className="absolute -translate-x-1/2" style={{ left: `${(100 * m) / span}%` }}>
            {clock(m)}
          </span>
        ))}
      </div>
      <p className="mt-2 text-[11px] leading-5 text-pn-muted">
        {t(
          "الزمن من بداية المناوبة. اللون الكامل = الصمام مفتوح؛ الفاتح = الماء يتسرب في التربة (Green-Ampt)؛ المخطط بالذهبي = نبضة غسيل؛ المظلل = تأخر المناوبة.",
          "Time from the start of the water turn. Solid = valve open; light = water soaking in (Green-Ampt); gold stripes = leaching pulse; hatched = turn delay.",
        )}
      </p>
    </div>
  );
}
