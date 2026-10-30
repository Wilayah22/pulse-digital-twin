"use client";

import { CalendarDays, CircleUserRound, MapPin } from "lucide-react";
import Image from "next/image";
import { SIMULATION_DAYS, SITE } from "../engine";
import { useSimulation } from "../state/SimulationProvider";
import { weatherInfo } from "../weather/codes";
import { fmt, shortDateAr } from "./ui";

/** Pulse logo cropped from the brand artwork: emblem with the wordmark to its left (RTL order: emblem, then name). */
export function PulseLogo({ height = 60 }: { height?: number }) {
  const wordH = Math.round(height * 0.42);
  return (
    <span className="flex shrink-0 items-center gap-2" aria-label="Pulse">
      <Image src="/pulse/logo-emblem.png" alt="" width={Math.round((height * 291) / 400)} height={height} priority />
      <Image src="/pulse/logo-wordmark.png" alt="Pulse" width={Math.round((wordH * 634) / 184)} height={wordH} priority />
    </span>
  );
}

function StatusPill() {
  const { running, dirty, result } = useSimulation();
  const state = !result ? "loading" : running ? "running" : dirty ? "dirty" : "ready";
  const meta = {
    loading: { label: "جارٍ التحميل", color: "#E6A23C" },
    running: { label: "جارٍ الحساب", color: "#2699C7" },
    dirty: { label: "تغييرات غير مطبّقة", color: "#D9A441" },
    ready: { label: "المحاكاة محدّثة", color: "#38A169" },
  }[state];
  return (
    <span className="flex items-center gap-2 rounded-full bg-pn-bg px-3 py-1.5 text-xs text-pn-navy ring-1 ring-pn-line">
      <span className="relative flex h-2.5 w-2.5">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ backgroundColor: meta.color }} />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ backgroundColor: meta.color }} />
      </span>
      {meta.label}
    </span>
  );
}

export function Header() {
  const { live, weather, applied } = useSimulation();
  const liveCurrent = applied.weatherMode === "live" && live.status === "ready" ? live.data?.current : null;
  const day1 = weather?.days[0];
  const temp = liveCurrent?.temperature ?? day1?.tMax;
  const code = liveCurrent?.weatherCode ?? day1?.weatherCode ?? 0;
  const info = weatherInfo(code);
  const sourceLabel =
    weather?.source === "open-meteo" ? "مباشر · Open-Meteo" : weather?.source === "custom" ? "سيناريو مخصص" : weather?.source === "demo" ? "بيانات تجريبية" : "…";
  const days = weather?.days ?? [];

  return (
    <header className="sticky top-0 z-30 flex h-[80px] items-center gap-4 border-b border-pn-line bg-white px-4 text-pn-navy shadow-[0_2px_12px_rgba(16,42,56,0.06)] lg:px-6">
      <div className="flex items-center gap-2.5">
        <PulseLogo />
      </div>
      <div className="hidden h-9 w-px bg-pn-line sm:block" />
      <div className="hidden leading-tight sm:block">
        <h1 className="text-lg font-bold">التوأم الرقمي</h1>
        <p className="latin text-xs text-pn-muted">Digital Twin Simulation</p>
      </div>

      <div className="ms-auto flex items-center gap-3 lg:gap-5">
        <div className="hidden items-center gap-2 text-end lg:flex">
          <div className="leading-tight">
            <div className="text-sm font-semibold">{SITE.nameAr}</div>
            <div className="latin text-[11px] text-pn-muted">
              {SITE.latitude}°N {SITE.longitude}°E
            </div>
          </div>
          <MapPin size={18} className="text-pn-gold" />
        </div>
        <div className="hidden h-8 w-px bg-pn-line lg:block" />
        <div className="flex items-center gap-2" title={sourceLabel}>
          <info.Icon size={26} style={{ color: info.color }} />
          <div className="leading-tight">
            <div className="num text-lg font-bold">{temp == null ? "—" : `${fmt(temp, 0)}°C`}</div>
            <div className="text-[11px] text-pn-muted">
              {info.label} · {sourceLabel}
            </div>
          </div>
        </div>
        <div className="hidden h-8 w-px bg-pn-line md:block" />
        <div className="hidden md:block">
          <StatusPill />
        </div>
        <div className="hidden items-center gap-2 xl:flex">
          <CalendarDays size={18} className="text-pn-muted" />
          <div className="leading-tight">
            <div className="text-xs font-semibold">مدة المحاكاة {SIMULATION_DAYS} أيام</div>
            <div className="text-[11px] text-pn-muted">
              {days.length ? `${shortDateAr(days[0].date)} – ${shortDateAr(days[days.length - 1].date)}` : "…"}
            </div>
          </div>
        </div>
        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-pn-bg text-pn-navy ring-1 ring-pn-line hover:bg-pn-line/60"
          aria-label="الملف الشخصي"
        >
          <CircleUserRound size={22} />
        </button>
      </div>
    </header>
  );
}
