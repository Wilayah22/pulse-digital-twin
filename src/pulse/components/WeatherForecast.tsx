"use client";

import { CloudSun, Droplet, LoaderCircle, RefreshCw, TriangleAlert, Wind } from "lucide-react";
import { useSimulation } from "../state/SimulationProvider";
import { weatherInfo } from "../weather/codes";
import { Card, CardHeader, InfoTip, Skeleton, fmt, shortDateAr, weekdayAr } from "./ui";

function SourceBadge() {
  const { weather, live, retryWeather, applied } = useSimulation();
  if (!weather) {
    return (
      <span className="flex items-center gap-1 text-[11px] text-pn-muted">
        <LoaderCircle size={12} className="animate-spin" /> جارٍ التحميل
      </span>
    );
  }
  if (weather.source === "open-meteo") {
    return (
      <span className="flex items-center gap-1.5 rounded-full bg-[#E6F4EC] px-2 py-0.5 text-[11px] font-semibold text-pn-forest">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-pn-green" /> بيانات حية · Open-Meteo
      </span>
    );
  }
  if (weather.source === "custom") {
    return <span className="rounded-full bg-[#FAF0DA] px-2 py-0.5 text-[11px] font-semibold text-[#8a5a12]">سيناريو تجريبي مخصص</span>;
  }
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-[#FBE7E5] px-2 py-0.5 text-[11px] font-semibold text-pn-danger">
      <TriangleAlert size={12} /> بيانات تجريبية — تعذر الاتصال
      {applied.weatherMode === "live" && live.status === "error" && (
        <button type="button" onClick={retryWeather} className="ms-1 rounded-full p-0.5 hover:bg-white/60" aria-label="إعادة المحاولة">
          <RefreshCw size={11} />
        </button>
      )}
    </span>
  );
}

export function WeatherForecast() {
  const { weather, selectedDay, setSelectedDay } = useSimulation();
  return (
    <Card id="weather" className="pb-4">
      <CardHeader title="الطقس للأيام القادمة" icon={<CloudSun size={18} />} subtitle="واحة الأحساء · 7 أيام" action={<SourceBadge />} />
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
                  <span className="text-xs font-bold text-pn-navy">{i === 0 ? "اليوم" : weekdayAr(d.date)}</span>
                  <span className="text-[10px] text-pn-muted">{shortDateAr(d.date)}</span>
                  <info.Icon size={26} className="my-1.5" style={{ color: info.color }} aria-label={info.label} />
                  <span className="num text-sm font-bold text-pn-navy">
                    {fmt(d.tMax, 0)}° <span className="text-xs font-normal text-pn-muted">/ {fmt(d.tMin, 0)}°</span>
                  </span>
                  <span className="mt-1 flex items-center gap-0.5 text-[10px] text-pn-muted">
                    <Wind size={10} /> <span className="num">{fmt(d.wind)}</span> م/ث
                  </span>
                  <span className="flex items-center gap-0.5 text-[10px] text-pn-water">
                    <Droplet size={10} /> <span className="num">{fmt(d.rain)}</span> مم
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
        ET0: التبخر-النتح المرجعي (مم/يوم) بطريقة بنمان-مونتيث FAO-56
        <InfoTip text="في الوضع المباشر يُؤخذ ET0 من متغير Open-Meteo اليومي et0_fao_evapotranspiration. في السيناريو التجريبي يُحسب محلياً بمعادلة FAO-56. الرياح مقدرة على ارتفاع 2 م." side="top" />
      </p>
    </Card>
  );
}
