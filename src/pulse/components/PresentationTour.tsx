"use client";

import { ChevronLeft, ChevronRight, Pause, Play, Presentation, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { estimateImpact, waterSavingPercent, type Recommendation, type ImpactAssumptions, type SimulationResult } from "../engine";
import { useLang } from "../i18n/LanguageProvider";
import { useSimulation } from "../state/SimulationProvider";
import { fmt } from "./ui";

interface Step {
  preset: string;
  day: number;
  title: string;
  titleEn: string;
  /** Recommendation kinds that best explain this step, in order of preference. */
  focus: Recommendation["kind"][];
  section: "twin" | "impact";
}

const STEPS: Step[] = [
  { preset: "normal", day: 1, title: "الوضع الطبيعي: من يحتاج الماء أولاً؟", titleEn: "Normal conditions: who needs water first?", focus: ["priority"], section: "twin" },
  { preset: "heatwave", day: 2, title: "موجة حر ورياح: الطلب يرتفع", titleEn: "Heatwave and wind: demand climbs", focus: ["schedule", "priority"], section: "twin" },
  { preset: "water-cut", day: 1, title: "انخفاض المياه 40%: توزيع الشح بعدل", titleEn: "40% less water: sharing scarcity fairly", focus: ["limit", "no-leaching", "priority"], section: "twin" },
  { preset: "outage", day: 5, title: "انقطاع مفاجئ: إدارة مخزون الخزان", titleEn: "Sudden outage: managing reservoir stock", focus: ["outage", "limit"], section: "twin" },
  { preset: "rain", day: 3, title: "أمطار غزيرة: لا ري بلا حاجة", titleEn: "Heavy rain: no irrigation without need", focus: ["rain", "leaching"], section: "twin" },
  { preset: "normal", day: 1, title: "الأثر على مستوى الواحة", titleEn: "Impact at oasis scale", focus: ["saving"], section: "impact" },
];

const STEP_MS = 12_000;

/** Caption text for a step, built only from the computed result. */
function caption(step: Step, r: SimulationResult, en: boolean, impact: ImpactAssumptions): { lead: string; stats: string } {
  const saving = waterSavingPercent(r);
  const stats = en
    ? `Saving ${fmt(saving, 0)}% · ${fmt(r.pulse.totalUsed)} m³ vs ${fmt(r.traditional.totalUsed)} m³ traditional · stress days ${r.pulse.stressDays} vs ${r.traditional.stressDays}`
    : `توفير ${fmt(saving, 0)}% · ${fmt(r.pulse.totalUsed)} م³ مقابل ${fmt(r.traditional.totalUsed)} م³ تقليدياً · أيام إجهاد ${r.pulse.stressDays} مقابل ${r.traditional.stressDays}`;
  if (step.section === "impact") {
    const est = estimateImpact(r, impact);
    const lead =
      est.annualWaterM3 > 0
        ? en
          ? `With ${fmt(impact.basins, 0)} basins and ${impact.weeksPerYear} similar weeks a year, Pulse saves about ${fmt(est.annualWaterM3 / 1e6, 2)} million m³ a year, enough for the household use of about ${fmt(est.peopleEquivalent / 1000, 1)}k people.`
          : `على ${fmt(impact.basins, 0)} حوض و${impact.weeksPerYear} أسبوعاً مشابهاً سنوياً، يوفّر Pulse نحو ${fmt(est.annualWaterM3 / 1e6, 2)} مليون م³ سنوياً، تكفي الاستهلاك المنزلي لنحو ${fmt(est.peopleEquivalent / 1000, 1)} ألف شخص.`
        : en
          ? "No surplus water in this scenario; Pulse's value is in sharing scarcity and reducing stress."
          : "في هذا السيناريو لا يوجد فائض مياه؛ فائدة Pulse في توزيع الشح وتقليل الإجهاد.";
    return { lead, stats };
  }
  const rec = step.focus.map((k) => r.recommendations.find((x) => x.kind === k)).find(Boolean) ?? r.recommendations[0];
  return { lead: rec ? `${rec.action} — ${rec.reason}` : "", stats };
}

interface TourValue {
  active: boolean;
  start: () => void;
}

const TourContext = createContext<TourValue>({ active: false, start: () => {} });
export const useTour = () => useContext(TourContext);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { applyPreset, setSelectedDay, setSelectedBasin, result, reset, impact } = useSimulation();
  const { t, lang, dir } = useLang();
  const en = lang === "en";
  const [index, setIndex] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);

  const go = useCallback(
    (i: number) => {
      const step = STEPS[i];
      setIndex(i);
      setSelectedBasin(null);
      applyPreset(step.preset);
      setSelectedDay(step.day);
      // Wait a frame so the presentation layout is applied before scrolling.
      requestAnimationFrame(() =>
        document.getElementById(step.section)?.scrollIntoView({ behavior: "smooth", block: "start" }),
      );
    },
    [applyPreset, setSelectedDay, setSelectedBasin],
  );

  const stop = useCallback(() => {
    setIndex(null);
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    reset();
  }, [reset]);

  const start = useCallback(() => {
    // Full screen must be requested inside the click; browsers without it still get the presentation layout.
    if (document.fullscreenEnabled && !document.fullscreenElement) {
      void document.documentElement.requestFullscreen().catch(() => {});
    }
    setPlaying(true);
    go(0);
  }, [go]);

  // Auto-advance; the last step stays until the presenter closes it.
  useEffect(() => {
    if (index === null || !playing || index >= STEPS.length - 1) return;
    const t = setTimeout(() => go(index + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [index, playing, go]);

  // Presentation layout: hide side panels so the twin fills the screen.
  const presenting = index !== null;
  useEffect(() => {
    document.documentElement.toggleAttribute("data-presenting", presenting);
    return () => document.documentElement.removeAttribute("data-presenting");
  }, [presenting]);

  // Leaving full screen (Esc in the browser) ends the presentation.
  useEffect(() => {
    if (!presenting) return;
    let entered = false;
    const onChange = () => {
      if (document.fullscreenElement) entered = true;
      else if (entered) stop();
    };
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [presenting, stop]);

  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stop();
      // The arrow pointing in the reading direction moves forward.
      const forward = dir === "rtl" ? "ArrowLeft" : "ArrowRight";
      const back = dir === "rtl" ? "ArrowRight" : "ArrowLeft";
      if (e.key === forward && index < STEPS.length - 1) go(index + 1);
      if (e.key === back && index > 0) go(index - 1);
      if (e.key === " ") {
        e.preventDefault();
        setPlaying((p) => !p);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, go, stop, dir]);

  const value = useMemo(() => ({ active: index !== null, start }), [index, start]);
  const step = index === null ? null : STEPS[index];
  const text = step && result ? caption(step, result, en, impact) : null;
  const Back = dir === "rtl" ? ChevronRight : ChevronLeft;
  const Forward = dir === "rtl" ? ChevronLeft : ChevronRight;

  return (
    <TourContext.Provider value={value}>
      {children}
      {step && index !== null && (
        <div dir={dir} className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
          <div
            key={index}
            role="dialog"
            aria-label={t("العرض التقديمي", "Presentation")}
            className="pulse-pop pointer-events-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-pn-navy/95 text-white shadow-2xl ring-1 ring-white/10 backdrop-blur"
          >
            <div className="h-1 bg-white/10">
              {playing && index < STEPS.length - 1 && (
                <div key={`${index}`} className="h-full bg-pn-gold" style={{ animation: `pulse-progress ${STEP_MS}ms linear forwards` }} />
              )}
            </div>
            <div className="p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2 text-[11px] font-semibold text-pn-gold">
                  <Presentation size={14} /> {t("العرض التقديمي", "Presentation")} · <span className="num">{index + 1}</span>/<span className="num">{STEPS.length}</span>
                </span>
                <button type="button" onClick={stop} className="rounded-full p-1 text-white/60 hover:bg-white/10 hover:text-white" aria-label={t("إنهاء العرض", "End presentation")}>
                  <X size={16} />
                </button>
              </div>
              <h3 className="mt-1 text-base font-bold sm:text-lg">{en ? step.titleEn : step.title}</h3>
              <p className="mt-1.5 text-[13px] leading-6 text-white/85">{text?.lead ?? t("جارٍ الحساب…", "Calculating…")}</p>
              {text && <p className="num mt-2 text-[11px] text-white/60">{text.stats}</p>}
              <div className="mt-3 flex items-center justify-between">
                <div className="flex gap-1">
                  {STEPS.map((s, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => go(i)}
                      aria-label={`${t("الخطوة", "Step")} ${i + 1}: ${en ? s.titleEn : s.title}`}
                      className={`h-2 rounded-full transition-all ${i === index ? "w-6 bg-pn-gold" : "w-2 bg-white/25 hover:bg-white/50"}`}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => index > 0 && go(index - 1)}
                    disabled={index === 0}
                    className="rounded-full p-2 text-white/80 hover:bg-white/10 disabled:opacity-30"
                    aria-label={t("السابق", "Previous")}
                  >
                    <Back size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPlaying((p) => !p)}
                    className="rounded-full bg-white/10 p-2 hover:bg-white/20"
                    aria-label={playing ? t("إيقاف مؤقت", "Pause") : t("تشغيل", "Play")}
                  >
                    {playing ? <Pause size={16} /> : <Play size={16} className={dir === "rtl" ? "-scale-x-100" : undefined} />}
                  </button>
                  {index < STEPS.length - 1 ? (
                    <button type="button" onClick={() => go(index + 1)} className="rounded-full p-2 text-white/80 hover:bg-white/10" aria-label={t("التالي", "Next")}>
                      <Forward size={18} />
                    </button>
                  ) : (
                    <button type="button" onClick={stop} className="rounded-full bg-pn-gold px-3 py-1.5 text-xs font-bold text-pn-navy hover:brightness-105">
                      {t("إنهاء العرض", "End presentation")}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </TourContext.Provider>
  );
}

export function StartTourButton() {
  const { start, active } = useTour();
  const { t } = useLang();
  return (
    <button
      type="button"
      onClick={start}
      disabled={active}
      className="flex items-center gap-2 rounded-full bg-pn-forest px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-[#125a43] disabled:opacity-60"
    >
      <Presentation size={15} />
      <span className="hidden sm:inline">{t("ابدأ العرض", "Start presentation")}</span>
    </button>
  );
}
