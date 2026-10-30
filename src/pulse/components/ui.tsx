"use client";

import { Info } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BasinHealth, BasinId, PriorityLevel } from "../engine";

export const COLORS = {
  navy: "#102A38",
  deep: "#153B4A",
  forest: "#176B50",
  green: "#38A169",
  water: "#2699C7",
  gold: "#D9A441",
  bg: "#F5F5F0",
  muted: "#718096",
  warning: "#E6A23C",
  danger: "#DC5B52",
  traditional: "#94A3B8",
} as const;

/** Identity colours for the three basins (charts, avatars). */
export const BASIN_COLORS: Record<BasinId, string> = { A: "#176B50", B: "#D9A441", C: "#2699C7" };

export const HEALTH_META: Record<BasinHealth, { label: string; color: string; soft: string }> = {
  healthy: { label: "رطوبة جيدة", color: COLORS.green, soft: "#E6F4EC" },
  moderate: { label: "إجهاد مائي متوسط", color: COLORS.warning, soft: "#FCF2DF" },
  critical: { label: "إجهاد مائي حرج", color: COLORS.danger, soft: "#FBE7E5" },
};

export const PRIORITY_META: Record<PriorityLevel, { label: string; color: string; soft: string }> = {
  critical: { label: "عالية", color: COLORS.danger, soft: "#FBE7E5" },
  medium: { label: "متوسطة", color: COLORS.gold, soft: "#FAF0DA" },
  low: { label: "منخفضة", color: COLORS.green, soft: "#E6F4EC" },
};

export function fmt(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function Card({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`scroll-mt-28 rounded-2xl border border-pn-line bg-white shadow-[0_1px_2px_rgba(16,42,56,0.04),0_8px_24px_-12px_rgba(16,42,56,0.12)] ${className}`}
    >
      {children}
    </section>
  );
}

export function CardHeader({
  title,
  icon,
  subtitle,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-3 px-5 pt-4">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 text-[15px] font-bold text-pn-navy">
          {icon && <span className="text-pn-forest">{icon}</span>}
          {title}
        </h2>
        {subtitle && <p className="mt-0.5 text-xs text-pn-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

/** Small (i) icon with an accessible hover/focus tooltip for technical metrics. */
export function InfoTip({ text, side = "bottom" }: { text: string; side?: "top" | "bottom" }) {
  return (
    <span className="group relative inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-pn-muted/80 hover:text-pn-forest focus-visible:text-pn-forest"
      >
        <Info size={13} />
      </button>
      <span
        role="tooltip"
        className={`pointer-events-none absolute start-1/2 z-40 hidden w-56 translate-x-1/2 rounded-lg bg-pn-navy px-3 py-2 text-[11px] leading-5 font-normal text-white shadow-lg group-focus-within:block group-hover:block ${
          side === "top" ? "bottom-6" : "top-6"
        }`}
      >
        {text}
      </span>
    </span>
  );
}

/** Animates between numeric values whenever `value` changes. */
export function useAnimatedNumber(value: number, duration = 700): number {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = performance.now();
    const initial = from.current;
    if (initial === value) return;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      const v = initial + (value - initial) * eased;
      setDisplay(v);
      from.current = v;
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display;
}

export function AnimatedNumber({ value, digits = 1, className = "" }: { value: number; digits?: number; className?: string }) {
  const v = useAnimatedNumber(value);
  return <span className={`num ${className}`}>{fmt(v, digits)}</span>;
}

export function Chip({ color, soft, children }: { color: string; soft: string; children: React.ReactNode }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap"
      style={{ color, backgroundColor: soft }}
    >
      {children}
    </span>
  );
}

export function BasinAvatar({ id, size = 36 }: { id: BasinId; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white shadow-sm ring-2 ring-white"
      style={{ width: size, height: size, backgroundColor: BASIN_COLORS[id], fontSize: size * 0.42 }}
    >
      {id}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-pn-line/70 ${className}`} />;
}

const weekdayFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { weekday: "long", timeZone: "UTC" });
const shortDateFmt = new Intl.DateTimeFormat("ar-SA-u-nu-latn-ca-gregory", { day: "numeric", month: "short", timeZone: "UTC" });

export function weekdayAr(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : weekdayFmt.format(d);
}

export function shortDateAr(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? iso : shortDateFmt.format(d);
}
