"use client";

import { CloudSun, Droplet, LoaderCircle, RefreshCw, TriangleAlert, Wind } from "lucide-react";
import { useSimulation } from "../state/SimulationProvider";
import { useLang } from "../i18n/LanguageProvider";
import { weatherInfo } from "../weather/codes";
import { Card, CardHeader, InfoTip, Skeleton, fmt, shortDateAr, weekdayAr } from "./ui";

function SourceBadge() {
  const { weather, live, retryWeather, applied } = useSimulation();
  const { t } = useLang();
  if (!weather) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-pn-muted">
        <LoaderCircle size={12} className="animate-spin" /> {t("جارٍ التحميل", "Loading")}
      </span>
    );
  }
  if (weather.source === "open-meteo") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-[#E6F4EC] px-2 py-0.5 text-[11px] font-semibold text-pn-forest">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pn-green" /> {t("بيانات حية · Open-Meteo", "Live data · Open-Meteo")}
      </span>
    );
  }
  if (weather.source === "custom") {
    return <span className="rounded-full bg-[#FAF0DA] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a12]">{t("سيناريو تجريبي مخصص", "Custom test scenario")}</span>;
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-[#FBE7E5] px-2 py-0.5 text-[11px] font-semibold text-pn-danger">
      <TriangleAlert size={12} /> {t("بيانات تجريبية — تعذر الاتصال", "Demo data: connection failed")}
      {applied.weatherMode === "live" && live.status === "error" && (
        <button type="button" onClick={retryWeather} className="ms-1 rounded-full p-0.5 hover:bg-white/60" aria-label={t("إعادة المحاولة", "Retry")}>
          <RefreshCw size={11} />
        </button>
      )}
    </span>
  );
}

export function WeatherForecast() {
  const { weather, selectedDay, setSelectedDay } = useSimulation();
  const { t, locale } = useLang();
  return (
    <Card id="weather" className="pb-4">
      <CardHeader
        title={t("الطقس للأيام القادمة", "Weather forecast")}
        icon={<CloudSun size={18} />}
        subtitle={t("واحة الأحساء · 7 أيام", "Al-Ahsa Oasis · 7 days")}
        action={<SourceBadge />}
      />
      <div className="mt-3 overflow-x-auto px-4">
        {!weather ? (
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }, (_, i) => (
              <Skeleton key={i} className="h-[150px]" />
            ))}
          </div>
        ) : (
          <div className="grid min-w-[620px] grid-cols-7 gap-2">
            {weather.days.map((d, i) => {
              const info = weatherInfo(d.weatherCode);
              const on = selectedDay === i + 1;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => setSelectedDay(i + 1)}
                  className={`flex flex-col items-center rounded-xl border px-1 py-2.5 text-center transition-all ${
                    on ? "border-pn-water bg-[#F2FAFD] shadow-sm" : "border-pn-line bg-[#FBFBF8] hover:border-pn-water/40"
                  }`}
                >
                  <span className="text-xs font-bold text-pn-navy">{i === 0 ? t("اليوم", "Today") : weekdayAr(d.date, locale)}</span>
                  <span className="text-[10px] text-pn-muted">{shortDateAr(d.date, locale)}</span>
                  <info.Icon size={26} className="my-1.5" style={{ color: info.color }} aria-label={t(info.label, info.labelEn)} />
                  <span className="num text-sm font-bold text-pn-navy">
                    {fmt(d.tMax, 0)}° <span className="text-xs font-normal text-pn-muted">/ {fmt(d.tMin, 0)}°</span>
                  </span>
                  <span className="mt-1 flex items-center gap-0.5 text-[10px] text-pn-muted">
                    <Wind size={10} /> <span className="num">{fmt(d.wind)}</span> {t("م/ث", "m/s")}
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-pn-water">
                    <Droplet size={10} /> <span className="num">{fmt(d.rain)}</span> {t("مم", "mm")}
                  </span>
                  <span className="mt-1 rounded-md bg-[#E6F4EC] px-1.5 py-0.5 text-[10px] font-semibold text-pn-forest">
                    ET0 <span className="num">{fmt(d.et0)}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
      <p className="mt-2 flex items-center gap-1 px-5 text-[10px] text-pn-muted">
        {t("ET0: التبخر-النتح المرجعي (مم/يوم) بطريقة بنمان-مونتيث FAO-56", "ET0: reference evapotranspiration (mm/day), FAO-56 Penman-Monteith")}
        <InfoTip
          text={t(
            "في الوضع المباشر يُؤخذ ET0 من متغير Open-Meteo اليومي et0_fao_evapotranspiration. في السيناريو التجريبي يُحسب محلياً بمعادلة FAO-56. الرياح مقدرة على ارتفاع 2 م.",
            "In live mode ET0 comes from Open-Meteo's daily et0_fao_evapotranspiration. In a custom scenario it is computed locally with FAO-56. Wind is estimated at 2 m.",
          )}
          side="top"
        />
      </p>
    </Card>
  );
}
