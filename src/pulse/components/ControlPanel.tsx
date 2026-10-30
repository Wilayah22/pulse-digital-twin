"use client";

import {
  ChevronDown,
  Clock,
  CloudSun,
  Droplet,
  FlaskConical,
  PlugZap,
  RefreshCw,
  RotateCcw,
  SlidersHorizontal,
  Sprout,
  Sun,
  Thermometer,
  TriangleAlert,
  Waves,
  Wind,
} from "lucide-react";
import { useState } from "react";
import { INPUT_LIMITS, type DustLevel, type SimulationInputs } from "../engine";
import { useLang } from "../i18n/LanguageProvider";
import { useSimulation } from "../state/SimulationProvider";
import { Card, CardHeader, InfoTip, fmt } from "./ui";

function SliderRow({
  icon,
  iconBg,
  accent,
  label,
  tip,
  value,
  unit,
  digits = 1,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  icon: React.ReactNode;
  iconBg: string;
  accent: string;
  label: string;
  tip?: string;
  value: number;
  unit: string;
  digits?: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const fill = ((value - min) / (max - min)) * 100;
  return (
    <div className={`rounded-xl border border-pn-line bg-white px-3 py-2.5 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: iconBg, color: accent }}>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="flex items-center gap-1 text-xs text-pn-muted">
              {label}
              {tip && <InfoTip text={tip} />}
            </span>
            <span className="text-sm font-bold text-pn-navy">
              <span className="num">{fmt(value, digits)}</span> <span className="text-[11px] font-medium text-pn-muted">{unit}</span>
            </span>
          </div>
          <input
            type="range"
            className="pulse-range mt-2"
            min={min}
            max={max}
            step={step}
            value={value}
            disabled={disabled}
            aria-label={label}
            onChange={(e) => onChange(Number(e.target.value))}
            style={{ "--fill": `${fill}%`, "--accent": accent } as React.CSSProperties}
          />
          <div className="mt-0.5 flex justify-between text-[10px] text-pn-muted/80">
            <span className="num">{min}</span>
            <span className="num">{max}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-lg bg-pn-bg p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 py-1.5 font-semibold transition-colors ${
            value === o.value ? "bg-white text-pn-navy shadow-sm" : "text-pn-muted hover:text-pn-navy"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function LiveWeatherSummary() {
  const { t } = useLang();
  const { live, retryWeather, weather, draft } = useSimulation();
  if (draft.weatherMode !== "live") return null;
  if (live.status === "loading") {
    return <div className="rounded-xl border border-pn-line px-3 py-3 text-xs text-pn-muted">{t("جارٍ جلب توقعات Open-Meteo للأحساء…", "Fetching the Open-Meteo forecast for Al-Ahsa…")}</div>;
  }
  if (live.status === "error") {
    return (
      <div className="rounded-xl border border-pn-warning/40 bg-[#FCF2DF] px-3 py-2.5 text-xs text-[#8a5a12]">
        <div className="flex items-center gap-1.5 font-semibold">
          <TriangleAlert size={14} /> {t("تعذر الاتصال بـ Open-Meteo", "Could not reach Open-Meteo")}
        </div>
        <p className="mt-1 leading-5">
          {t("تعمل المحاكاة الآن على سيناريو تجريبي موسوم بوضوح، وليس على بيانات حية.", "The simulation is running on a clearly labelled demo scenario, not live data.")}
        </p>
        <button type="button" onClick={retryWeather} className="mt-1.5 font-semibold text-pn-forest underline-offset-2 hover:underline">
          {t("إعادة المحاولة", "Retry")}
        </button>
      </div>
    );
  }
  const days = live.data?.series.days ?? weather?.days ?? [];
  const avg = (k: "tMax" | "wind" | "et0") => days.reduce((a, d) => a + d[k], 0) / Math.max(1, days.length);
  const rain = days.reduce((a, d) => a + d.rain, 0);
  const cells = [
    { label: t("الحرارة العظمى", "Max temp"), value: `${fmt(avg("tMax"), 0)}°C` },
    { label: t("الرياح", "Wind"), value: `${fmt(avg("wind"))} ${t("م/ث", "m/s")}` },
    { label: t("الأمطار", "Rain"), value: `${fmt(rain)} ${t("مم", "mm")}` },
    { label: "ET0", value: `${fmt(avg("et0"))} ${t("مم", "mm")}` },
  ];
  return (
    <div className="rounded-xl border border-pn-line px-3 py-2.5">
      <div className="mb-2 flex items-center gap-2 text-[11px] text-pn-muted">
        <Sun size={14} className="text-pn-warning" /> {t("متوسط 7 أيام (Open-Meteo)", "7-day average (Open-Meteo)")}
      </div>
      <div className="grid grid-cols-4 gap-1 text-center">
        {cells.map((c) => (
          <div key={c.label}>
            <div className="text-[10px] text-pn-muted">{c.label}</div>
            <div className="num text-[13px] font-bold text-pn-navy">{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ControlPanel() {
  const { t } = useLang();
  const { draft, setDraft, rerun, reset, running, dirty } = useSimulation();
  const [advanced, setAdvanced] = useState(false);
  const L = INPUT_LIMITS;
  const set = <K extends keyof SimulationInputs>(k: K, v: SimulationInputs[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setCw = <K extends keyof SimulationInputs["customWeather"]>(k: K, v: SimulationInputs["customWeather"][K]) =>
    setDraft((d) => ({ ...d, customWeather: { ...d.customWeather, [k]: v } }));
  const custom = draft.weatherMode === "custom";

  return (
    <Card id="controls" className="pb-4">
      <CardHeader
        title={t("تعديل ظروف المحاكاة", "Simulation conditions")}
        icon={<SlidersHorizontal size={18} />}
        subtitle={t("عدّل الظروف ثم أعد تشغيل المحاكاة", "Adjust the conditions, then re-run the simulation")}
      />
      <div className="mt-3 space-y-2.5 px-4">
        <SliderRow
          icon={<Droplet size={17} />}
          iconBg="#E3F3FA"
          accent="#2699C7"
          label={t("المياه المتاحة", "Available water")}
          tip={t(
            "حجم المياه الذي يصل إلى الخزان المشترك خلال فترة المحاكاة (7 أيام)، يُورَّد على مناوبات يومية متساوية.",
            "Water delivered to the shared reservoir over the 7-day period, in equal daily turns.",
          )}
          value={draft.availableWater}
          unit={t("م³", "m³")}
          digits={0}
          {...L.availableWater}
          onChange={(v) => set("availableWater", v)}
        />
        <SliderRow
          icon={<Waves size={17} />}
          iconBg="#E6F4EC"
          accent="#38A169"
          label={t("ملوحة مياه الري ECw", "Irrigation water salinity ECw")}
          tip={t(
            "ملوحة مياه الري (ECw) تختلف عن ملوحة التربة (ECe). تُستخدم لحساب تراكم الأملاح ومتطلب الغسيل.",
            "Irrigation water salinity (ECw) differs from soil salinity (ECe). It drives salt build-up and the leaching requirement.",
          )}
          value={draft.ecw}
          unit="dS/m"
          {...L.ecw}
          onChange={(v) => set("ecw", v)}
        />
        <SliderRow
          icon={<Clock size={17} />}
          iconBg="#EEF0F4"
          accent="#153B4A"
          label={t("تأخر المناوبة", "Water-turn delay")}
          tip={t(
            "تأخر وصول المناوبة الأولى. تنتقل حصة التأخير إلى اليوم التالي، ويستمر التبخر-النتح أثناء الانتظار.",
            "Delay of the first water turn. The delayed share moves to the next day, and evapotranspiration continues while waiting.",
          )}
          value={draft.delayHours}
          unit={t("ساعة", "h")}
          digits={0}
          {...L.delayHours}
          onChange={(v) => set("delayHours", v)}
        />

        <div className="rounded-xl border border-pn-line bg-white px-3 py-2.5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FBE7E5] text-pn-danger">
              <PlugZap size={17} />
            </span>
            <label className="flex flex-1 items-center justify-between gap-2 text-xs text-pn-muted">
              {t("انقطاع الإمداد", "Supply outage")}
              <select
                value={draft.outageFromDay}
                onChange={(e) => set("outageFromDay", Number(e.target.value))}
                className="rounded-lg border border-pn-line bg-white px-2 py-1 text-sm font-semibold text-pn-navy"
              >
                <option value={0}>{t("بدون انقطاع", "No outage")}</option>
                {Array.from({ length: 6 }, (_, i) => i + 2).map((d) => (
                  <option key={d} value={d}>
                    {t(`من اليوم ${d}`, `From day ${d}`)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-pn-line bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-pn-navy">
              <CloudSun size={15} className="text-pn-warning" /> {t("الطقس", "Weather")}
            </span>
          </div>
          <Segmented
            label={t("مصدر بيانات الطقس", "Weather data source")}
            value={draft.weatherMode}
            onChange={(v) => set("weatherMode", v)}
            options={[
              { value: "live", label: t("Open-Meteo مباشر", "Live Open-Meteo") },
              { value: "custom", label: t("سيناريو تجريبي", "Custom scenario") },
            ]}
          />
          <div className="mt-2.5 space-y-2">
            {custom ? (
              <>
                <SliderRow
                  icon={<Thermometer size={16} />}
                  iconBg="#FCF2DF"
                  accent="#E6A23C"
                  label={t("درجة الحرارة العظمى", "Max temperature")}
                  value={draft.customWeather.temperature}
                  unit="°C"
                  digits={0}
                  {...L.temperature}
                  onChange={(v) => setCw("temperature", v)}
                />
                <SliderRow
                  icon={<Wind size={16} />}
                  iconBg="#EEF0F4"
                  accent="#718096"
                  label={t("سرعة الرياح (2 م)", "Wind speed (2 m)")}
                  value={draft.customWeather.wind}
                  unit={t("م/ث", "m/s")}
                  {...L.wind}
                  onChange={(v) => setCw("wind", v)}
                />
                <SliderRow
                  icon={<Droplet size={16} />}
                  iconBg="#E3F3FA"
                  accent="#2699C7"
                  label={t("الأمطار خلال الفترة", "Rainfall over the period")}
                  value={draft.customWeather.rainfall}
                  unit={t("مم", "mm")}
                  digits={0}
                  {...L.rainfall}
                  onChange={(v) => setCw("rainfall", v)}
                />
                <div>
                  <div className="mb-1 flex items-center gap-1 text-xs text-pn-muted">
                    {t("سيناريو الغبار", "Dust scenario")}
                    <InfoTip
                      text={t(
                        "يخفّض الغبار الإشعاع الشمسي الواصل (15% متوسط، 30% شديد) في معادلة بنمان-مونتيث.",
                        "Dust cuts incoming solar radiation (15% moderate, 30% severe) in the Penman-Monteith equation.",
                      )}
                    />
                  </div>
                  <Segmented<DustLevel>
                    label={t("سيناريو الغبار", "Dust scenario")}
                    value={draft.customWeather.dust}
                    onChange={(v) => setCw("dust", v)}
                    options={[
                      { value: "none", label: t("بدون", "None") },
                      { value: "moderate", label: t("متوسط", "Moderate") },
                      { value: "severe", label: t("شديد", "Severe") },
                    ]}
                  />
                </div>
              </>
            ) : (
              <LiveWeatherSummary />
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setAdvanced((a) => !a)}
          className="flex w-full items-center justify-between rounded-lg px-1 text-xs font-semibold text-pn-muted hover:text-pn-navy"
          aria-expanded={advanced}
        >
          {t("معاملات متقدمة", "Advanced parameters")}
          <ChevronDown size={14} className={`transition-transform ${advanced ? "rotate-180" : ""}`} />
        </button>
        {advanced && (
          <SliderRow
            icon={<Sprout size={16} />}
            iconBg="#E6F4EC"
            accent="#176B50"
            label={t("معامل المحصول Kc", "Crop coefficient Kc")}
            tip={t(
              "ETc = Kc × ET0. القيمة 0.95 افتراضية تجريبية مؤقتة للنخيل المثمر، وتُعاير ميدانياً.",
              "ETc = Kc × ET0. 0.95 is a provisional experimental default for mature date palms, to be calibrated in the field.",
            )}
            value={draft.kc}
            unit=""
            digits={2}
            {...L.kc}
            onChange={(v) => set("kc", v)}
          />
        )}

        {dirty && (
          <p className="flex items-center gap-1.5 rounded-lg bg-[#FAF0DA] px-3 py-2 text-[11px] text-[#8a5a12]">
            <FlaskConical size={13} /> {t("لديك تغييرات لم تُطبّق بعد — أعد تشغيل المحاكاة.", "You have unapplied changes. Re-run the simulation.")}
          </p>
        )}

        <button
          type="button"
          onClick={rerun}
          disabled={running}
          className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-md transition-all ${
            dirty ? "bg-pn-forest hover:bg-[#125a43] ring-4 ring-pn-forest/15" : "bg-pn-navy hover:bg-pn-deep"
          } disabled:opacity-80`}
        >
          <RefreshCw size={16} className={running ? "animate-spin" : ""} />
          {running ? t("جارٍ الحساب…", "Calculating…") : t("إعادة تشغيل المحاكاة", "Re-run simulation")}
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-pn-line px-4 py-2 text-xs font-semibold text-pn-muted hover:border-pn-navy/30 hover:text-pn-navy"
        >
          <RotateCcw size={14} /> {t("استعادة الظروف الافتراضية", "Restore default conditions")}
        </button>
      </div>
    </Card>
  );
}
