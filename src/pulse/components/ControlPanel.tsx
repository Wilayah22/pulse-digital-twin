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
  const { live, retryWeather, weather, draft } = useSimulation();
  if (draft.weatherMode !== "live") return null;
  if (live.status === "loading") {
    return <div className="rounded-xl border border-pn-line px-3 py-3 text-xs text-pn-muted">جارٍ جلب توقعات Open-Meteo للأحساء…</div>;
  }
  if (live.status === "error") {
    return (
      <div className="rounded-xl border border-pn-warning/40 bg-[#FCF2DF] px-3 py-2.5 text-xs text-[#8a5a12]">
        <div className="flex items-center gap-1.5 font-semibold">
          <TriangleAlert size={14} /> تعذر الاتصال بـ Open-Meteo
        </div>
        <p className="mt-1 leading-5">تعمل المحاكاة الآن على سيناريو تجريبي موسوم بوضوح، وليس على بيانات حية.</p>
        <button type="button" onClick={retryWeather} className="mt-1.5 font-semibold text-pn-forest underline-offset-2 hover:underline">
          إعادة المحاولة
        </button>
      </div>
    );
  }
  const days = live.data?.series.days ?? weather?.days ?? [];
  const avg = (k: "tMax" | "wind" | "et0") => days.reduce((a, d) => a + d[k], 0) / Math.max(1, days.length);
  const rain = days.reduce((a, d) => a + d.rain, 0);
  const cells = [
    { label: "الحرارة العظمى", value: `${fmt(avg("tMax"), 0)}°C` },
    { label: "الرياح", value: `${fmt(avg("wind"))} م/ث` },
    { label: "الأمطار", value: `${fmt(rain)} مم` },
    { label: "ET0", value: `${fmt(avg("et0"))} مم` },
  ];
  return (
    <div className="rounded-xl border border-pn-line px-3 py-2.5">
      <div className="mb-2 flex items-center gap-2 text-[11px] text-pn-muted">
        <Sun size={14} className="text-pn-warning" /> متوسط 7 أيام (Open-Meteo)
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
  const { draft, setDraft, rerun, reset, running, dirty } = useSimulation();
  const [advanced, setAdvanced] = useState(false);
  const L = INPUT_LIMITS;
  const set = <K extends keyof SimulationInputs>(k: K, v: SimulationInputs[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setCw = <K extends keyof SimulationInputs["customWeather"]>(k: K, v: SimulationInputs["customWeather"][K]) =>
    setDraft((d) => ({ ...d, customWeather: { ...d.customWeather, [k]: v } }));
  const custom = draft.weatherMode === "custom";

  return (
    <Card id="controls" className="pb-4">
      <CardHeader title="تعديل ظروف المحاكاة" icon={<SlidersHorizontal size={18} />} subtitle="عدّل الظروف ثم أعد تشغيل المحاكاة" />
      <div className="mt-3 space-y-2.5 px-4">
        <SliderRow
          icon={<Droplet size={17} />}
          iconBg="#E3F3FA"
          accent="#2699C7"
          label="المياه المتاحة"
          tip="حجم المياه الذي يصل إلى الخزان المشترك خلال فترة المحاكاة (7 أيام)، يُورَّد على مناوبات يومية متساوية."
          value={draft.availableWater}
          unit="م³"
          digits={0}
          {...L.availableWater}
          onChange={(v) => set("availableWater", v)}
        />
        <SliderRow
          icon={<Waves size={17} />}
          iconBg="#E6F4EC"
          accent="#38A169"
          label="ملوحة مياه الري ECw"
          tip="ملوحة مياه الري (ECw) تختلف عن ملوحة التربة (ECe). تُستخدم لحساب تراكم الأملاح ومتطلب الغسيل."
          value={draft.ecw}
          unit="dS/m"
          {...L.ecw}
          onChange={(v) => set("ecw", v)}
        />
        <SliderRow
          icon={<Clock size={17} />}
          iconBg="#EEF0F4"
          accent="#153B4A"
          label="تأخر المناوبة"
          tip="تأخر وصول المناوبة الأولى. تنتقل حصة التأخير إلى اليوم التالي، ويستمر التبخر-النتح أثناء الانتظار."
          value={draft.delayHours}
          unit="ساعة"
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
              انقطاع الإمداد
              <select
                value={draft.outageFromDay}
                onChange={(e) => set("outageFromDay", Number(e.target.value))}
                className="rounded-lg border border-pn-line bg-white px-2 py-1 text-sm font-semibold text-pn-navy"
              >
                <option value={0}>بدون انقطاع</option>
                {Array.from({ length: 6 }, (_, i) => i + 2).map((d) => (
                  <option key={d} value={d}>
                    من اليوم {d}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="rounded-xl border border-pn-line bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-pn-navy">
              <CloudSun size={15} className="text-pn-warning" /> الطقس
            </span>
          </div>
          <Segmented
            label="مصدر بيانات الطقس"
            value={draft.weatherMode}
            onChange={(v) => set("weatherMode", v)}
            options={[
              { value: "live", label: "Open-Meteo مباشر" },
              { value: "custom", label: "سيناريو تجريبي" },
            ]}
          />
          <div className="mt-2.5 space-y-2">
            {custom ? (
              <>
                <SliderRow
                  icon={<Thermometer size={16} />}
                  iconBg="#FCF2DF"
                  accent="#E6A23C"
                  label="درجة الحرارة العظمى"
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
                  label="سرعة الرياح (2 م)"
                  value={draft.customWeather.wind}
                  unit="م/ث"
                  {...L.wind}
                  onChange={(v) => setCw("wind", v)}
                />
                <SliderRow
                  icon={<Droplet size={16} />}
                  iconBg="#E3F3FA"
                  accent="#2699C7"
                  label="الأمطار خلال الفترة"
                  value={draft.customWeather.rainfall}
                  unit="مم"
                  digits={0}
                  {...L.rainfall}
                  onChange={(v) => setCw("rainfall", v)}
                />
                <div>
                  <div className="mb-1 flex items-center gap-1 text-xs text-pn-muted">
                    سيناريو الغبار
                    <InfoTip text="يخفّض الغبار الإشعاع الشمسي الواصل (15% متوسط، 30% شديد) في معادلة بنمان-مونتيث." />
                  </div>
                  <Segmented<DustLevel>
                    label="سيناريو الغبار"
                    value={draft.customWeather.dust}
                    onChange={(v) => setCw("dust", v)}
                    options={[
                      { value: "none", label: "بدون" },
                      { value: "moderate", label: "متوسط" },
                      { value: "severe", label: "شديد" },
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
          معاملات متقدمة
          <ChevronDown size={14} className={`transition-transform ${advanced ? "rotate-180" : ""}`} />
        </button>
        {advanced && (
          <SliderRow
            icon={<Sprout size={16} />}
            iconBg="#E6F4EC"
            accent="#176B50"
            label="معامل المحصول Kc"
            tip="ETc = Kc × ET0. القيمة 0.95 افتراضية تجريبية مؤقتة للنخيل المثمر، وتُعاير ميدانياً."
            value={draft.kc}
            unit=""
            digits={2}
            {...L.kc}
            onChange={(v) => set("kc", v)}
          />
        )}

        {dirty && (
          <p className="flex items-center gap-1.5 rounded-lg bg-[#FAF0DA] px-3 py-2 text-[11px] text-[#8a5a12]">
            <FlaskConical size={13} /> لديك تغييرات لم تُطبّق بعد — أعد تشغيل المحاكاة.
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
          {running ? "جارٍ الحساب…" : "إعادة تشغيل المحاكاة"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-pn-line px-4 py-2 text-xs font-semibold text-pn-muted hover:border-pn-navy/30 hover:text-pn-navy"
        >
          <RotateCcw size={14} /> استعادة الظروف الافتراضية
        </button>
      </div>
    </Card>
  );
}
