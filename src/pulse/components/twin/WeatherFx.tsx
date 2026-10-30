// Animated sky and weather layers for the twin scene. Elements are always rendered and faded via opacity,
// so switching scenarios cross-fades instead of popping.

import type { Atmosphere } from "./atmosphere";

const W = 1200;
const H = 560;
const FADE = { transition: "opacity 1.2s ease" } as const;
/** Sun sits top-right, clear of the title card and the palm crowns. */
const SUN = { x: 1030, y: 64 };

// Deterministic pseudo-random positions (no Math.random, so renders are stable).
const seq = (n: number, seed: number) => Array.from({ length: n }, (_, i) => ((Math.sin((i + 1) * 12.9898 + seed) * 43758.5453) % 1 + 1) % 1);

/** Warm/overcast/dust tints over the base sky. */
export function SkyTint({ a }: { a: Atmosphere }) {
  return (
    <g>
      <rect width={W} height={300} fill="url(#pn-sky-heat)" style={{ ...FADE, opacity: a.heat * 0.85 * (1 - a.clouds * 0.6) }} />
      <rect width={W} height={300} fill="#8996a0" style={{ ...FADE, opacity: a.clouds * 0.5 }} />
      <rect width={W} height={300} fill="#d8b47c" style={{ ...FADE, opacity: a.dust * 0.55 }} />
    </g>
  );
}

export function Sun({ a }: { a: Atmosphere }) {
  const visible = Math.max(0.12, 1 - a.clouds * 0.85 - a.dust * 0.45);
  const r = 22 + a.heat * 16;
  const glow = 110 + a.heat * 90;
  const core = a.heat > 0.6 ? "#fff1c1" : "#fff7dd";
  return (
    <g style={{ ...FADE, opacity: visible }}>
      <circle cx={SUN.x} cy={SUN.y} r={glow} fill="url(#pn-sun)" style={{ transition: "r 1.2s ease" }} />
      <g className="pulse-spin" style={{ transformOrigin: `${SUN.x}px ${SUN.y}px`, opacity: 0.25 + a.heat * 0.6, transition: "opacity 1.2s" }}>
        {Array.from({ length: 12 }, (_, i) => {
          const ang = (i * Math.PI) / 6;
          const r0 = r + 10;
          const r1 = r + 22 + a.heat * 22;
          return (
            <line
              key={i}
              x1={SUN.x + Math.cos(ang) * r0}
              y1={SUN.y + Math.sin(ang) * r0}
              x2={SUN.x + Math.cos(ang) * r1}
              y2={SUN.y + Math.sin(ang) * r1}
              stroke="#ffe39a"
              strokeWidth={3}
              strokeLinecap="round"
              style={{ transition: "all 1.2s ease" }}
            />
          );
        })}
      </g>
      <circle cx={SUN.x} cy={SUN.y} r={r} fill={core} style={{ transition: "r 1.2s ease, fill 1.2s" }} />
    </g>
  );
}

function Cloud({ scale, dark }: { scale: number; dark: boolean }) {
  const top = dark ? "#c5ccd1" : "#ffffff";
  const bottom = dark ? "#8f9aa2" : "#e4ecf0";
  return (
    <g transform={`scale(${scale})`}>
      <ellipse cx={0} cy={18} rx={78} ry={18} fill={bottom} />
      <circle cx={-38} cy={6} r={26} fill={top} />
      <circle cx={0} cy={-6} r={36} fill={top} />
      <circle cx={42} cy={6} r={24} fill={top} />
      <ellipse cx={0} cy={18} rx={70} ry={12} fill={bottom} opacity={0.7} />
    </g>
  );
}

const CLOUDS = [
  { y: 58, s: 0.9, at: 0.05 },
  { y: 108, s: 0.7, at: 0.35 },
  { y: 40, s: 1.1, at: 0.6 },
  { y: 128, s: 0.6, at: 0.8 },
  { y: 76, s: 0.8, at: 0.2 },
  { y: 30, s: 0.75, at: 0.48 },
  { y: 150, s: 0.55, at: 0.92 },
];

/** Drifting clouds; count and darkness follow cloud cover, speed follows wind. */
export function Clouds({ a }: { a: Atmosphere }) {
  const shown = Math.round(a.clouds * CLOUDS.length);
  const duration = 90 - a.wind * 60;
  return (
    <g>
      {CLOUDS.map((c, i) => (
        <g key={i} style={{ ...FADE, opacity: i < shown ? 0.95 : 0 }}>
          <g
            className="pulse-drift"
            style={{ animationDuration: `${duration}s`, animationDelay: `${-c.at * duration}s` }}
          >
            <g transform={`translate(0,${c.y})`}>
              <Cloud scale={c.s} dark={a.rain > 0} />
            </g>
          </g>
        </g>
      ))}
    </g>
  );
}

const RAIN_X = seq(90, 3);
const RAIN_D = seq(90, 7);

/** Rain streaks over the whole scene, slanted by wind. */
export function Rain({ a }: { a: Atmosphere }) {
  const shown = Math.round(a.rain * RAIN_X.length);
  const slant = 6 + a.wind * 18;
  return (
    <g style={{ ...FADE, opacity: a.rain > 0 ? 1 : 0 }} pointerEvents="none">
      <rect width={W} height={H} fill="#5d7380" opacity={a.rain * 0.12} />
      {RAIN_X.map((x, i) => (
        <line
          key={i}
          x1={x * (W + 120) - 60}
          y1={-30}
          x2={x * (W + 120) - 60 - slant}
          y2={-6}
          stroke="#d9eef7"
          strokeWidth={1.6}
          strokeLinecap="round"
          className="pulse-rain"
          style={{ opacity: i < shown ? 0.75 : 0, animationDelay: `${-RAIN_D[i] * 0.9}s`, animationDuration: `${0.75 + RAIN_D[i] * 0.3}s` }}
        />
      ))}
    </g>
  );
}

const DUST_Y = seq(60, 11);
const DUST_D = seq(60, 13);

/** Dust haze plus wind-blown particles. */
export function Dust({ a }: { a: Atmosphere }) {
  const shown = Math.round(a.dust * DUST_Y.length);
  const duration = 7 - a.wind * 4;
  return (
    <g style={{ ...FADE, opacity: a.dust > 0 ? 1 : 0 }} pointerEvents="none">
      <rect width={W} height={H} fill="url(#pn-dust)" opacity={a.dust * 0.55} />
      {DUST_Y.map((y, i) => (
        <circle
          key={i}
          cx={0}
          cy={140 + y * 400}
          r={1.2 + DUST_D[i] * 1.8}
          fill="#c79c5e"
          className="pulse-drift-fast"
          style={{ opacity: i < shown ? 0.6 : 0, animationDuration: `${duration * (0.7 + DUST_D[i] * 0.6)}s`, animationDelay: `${-DUST_D[i] * duration}s` }}
        />
      ))}
    </g>
  );
}

/** Heat shimmer bands above the sand on very hot days. */
export function HeatShimmer({ a }: { a: Atmosphere }) {
  const k = Math.max(0, (a.heat - 0.45) / 0.55);
  return (
    <g style={{ ...FADE, opacity: k }} pointerEvents="none">
      {[270, 290, 520].map((y, i) => (
        <path
          key={y}
          d={`M-40,${y} q30,-5 60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0 t60,0`}
          stroke="#fff4dc"
          strokeWidth={3}
          fill="none"
          opacity={0.35}
          className="pulse-shimmer-wave"
          style={{ animationDelay: `${i * 0.6}s` }}
        />
      ))}
    </g>
  );
}

/** Brief dusk → dawn dimming when the timeline auto-advances to a new day. */
export function DayCycle({ day, active }: { day: number; active: boolean }) {
  if (!active) return null;
  return <rect key={day} width={W} height={H} fill="#0d1f33" className="pulse-night" pointerEvents="none" />;
}

export function WeatherDefs() {
  return (
    <>
      <linearGradient id="pn-sky-heat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#f2a65a" stopOpacity="0.55" />
        <stop offset="1" stopColor="#ffd59a" stopOpacity="0.15" />
      </linearGradient>
      <linearGradient id="pn-dust" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d6ad72" stopOpacity="0.9" />
        <stop offset="0.6" stopColor="#d6ad72" stopOpacity="0.45" />
        <stop offset="1" stopColor="#d6ad72" stopOpacity="0.2" />
      </linearGradient>
      <pattern id="pn-salt" width="22" height="16" patternUnits="userSpaceOnUse">
        <circle cx="3" cy="4" r="2.2" fill="#ffffff" />
        <circle cx="13" cy="2" r="1.5" fill="#f7f4ee" />
        <circle cx="17" cy="10" r="2.4" fill="#ffffff" />
        <circle cx="7" cy="12" r="1.6" fill="#f2eee6" />
        <ellipse cx="11" cy="7" rx="4.5" ry="1.6" fill="#ffffff" opacity="0.85" />
      </pattern>
    </>
  );
}
