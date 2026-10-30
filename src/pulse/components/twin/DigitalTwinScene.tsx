"use client";

import { Clock, Droplet, Pause, PlugZap, Play, Radio, Thermometer, Wind } from "lucide-react";
import { useEffect, useState } from "react";
import { SIMULATION_DAYS, type BasinId } from "../../engine";
import { useSimulation } from "../../state/SimulationProvider";
import { basinDayViews, reservoirOnDay, type BasinDayView } from "../../state/selectors";
import { COLORS, HEALTH_META, Skeleton, fmt, shortDateAr } from "../ui";
import { BasinDetailPanel } from "./BasinDetailPanel";
import { Palm } from "./Palm";
import { atmosphereFor, type Atmosphere } from "./atmosphere";
import { Clouds, DayCycle, Dust, HeatShimmer, Rain, SkyTint, Sun, WeatherDefs } from "./WeatherFx";

const W = 1200;
const H = 560;
const BASIN_X: Record<BasinId, number> = { A: 255, B: 548, C: 841 };
const PIPE_Y = 492;
const TANK = { x: 1078, top: 322, bottom: 452, rx: 66, ry: 17 };

// Basin geometry (single-point perspective per basin)
const BACK_Y = 300;
const FRONT_Y = 404;
const WALL_H = 34;
const BACK_HW = 100;
const FRONT_HW = 126;

const pct = (x: number, total: number) => `${(100 * x) / total}%`;

function mix(a: string, b: string, t: number): string {
  const pa = a.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  const pb = b.match(/\w\w/g)!.map((h) => parseInt(h, 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Dry sand-coloured soil darkens towards wet loam as available water rises. */
function soilColors(moisture: number) {
  const t = Math.max(0, Math.min(1, moisture / 100));
  const base = mix("cfa874", "5e3f26", t);
  return { back: mix(base.slice(1), "2a1b10", 0.22), front: mix(base.slice(1), "ffffff", 0.06), furrow: mix(base.slice(1), "1c120a", 0.35) };
}

function flowDuration(volume: number) {
  return `${Math.max(0.5, Math.min(2.6, 2.8 - volume / 6)).toFixed(2)}s`;
}

/** Interpolate across the soil trapezoid: u ∈ [-1, 1] left→right, v ∈ [0, 1] back→front. */
function soilPoint(cx: number, u: number, v: number) {
  const y0 = BACK_Y + 20;
  const y1 = FRONT_Y - 11;
  const hw = BACK_HW - 18 + (FRONT_HW - 18 - (BACK_HW - 18)) * v;
  return { x: cx + u * hw, y: y0 + (y1 - y0) * v };
}

const SPROUTS: [number, number][] = [
  [-0.78, 0.2], [-0.45, 0.16], [0.45, 0.16], [0.78, 0.22],
  [-0.85, 0.55], [-0.55, 0.62], [0.55, 0.6], [0.86, 0.52],
  [-0.7, 0.9], [-0.35, 0.88], [0.32, 0.9], [0.68, 0.86], [0.02, 0.95],
];

function Sprout({ x, y, color, s = 1 }: { x: number; y: number; color: string; s?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx={0} cy={1.5} rx={7} ry={2} fill="#000" opacity={0.12} />
      <path d="M0,0 C-2,-6 -9,-9 -12,-7 C-9,-3 -4,-1 0,0 Z" fill={color} />
      <path d="M0,0 C2,-7 9,-11 13,-9 C10,-4 4,-1 0,0 Z" fill={color} />
      <path d="M0,0 C-1,-6 1,-12 3,-15 C5,-10 3,-4 0,0 Z" fill={mix(color.slice(1), "ffffff", 0.18)} />
    </g>
  );
}

function Basin({ v, selected, onSelect, salt }: { v: BasinDayView; selected: boolean; onSelect: () => void; salt: number }) {
  const cx = BASIN_X[v.id];
  const irrigating = v.irrigation > 1e-6;
  const rim = `${cx - BACK_HW},${BACK_Y} ${cx + BACK_HW},${BACK_Y} ${cx + FRONT_HW},${FRONT_Y} ${cx - FRONT_HW},${FRONT_Y}`;
  const opening = `${cx - BACK_HW + 14},${BACK_Y + 9} ${cx + BACK_HW - 14},${BACK_Y + 9} ${cx + FRONT_HW - 16},${FRONT_Y - 11} ${cx - FRONT_HW + 16},${FRONT_Y - 11}`;
  const a = soilPoint(cx, -1, 0);
  const b = soilPoint(cx, 1, 0);
  const c = soilPoint(cx, 1, 1);
  const d = soilPoint(cx, -1, 1);
  const soil = `${a.x},${a.y} ${b.x},${b.y} ${c.x},${c.y} ${d.x},${d.y}`;
  const sc = soilColors(v.moistureBefore);
  const plant = mix(HEALTH_META[v.health].color.slice(1), "1f5a2a", 0.45);
  const sensor = soilPoint(cx, 0.72, 0.12);

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${v.name}: رطوبة ${fmt(v.moistureBefore, 0)}%`}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onSelect()}
      className="cursor-pointer outline-none [&:focus-visible_.pn-outline]:opacity-100 [&:hover_.pn-outline]:opacity-70"
    >
      <defs>
        <linearGradient id={`pn-soil-${v.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sc.back} style={{ transition: "stop-color 0.8s" }} />
          <stop offset="1" stopColor={sc.front} style={{ transition: "stop-color 0.8s" }} />
        </linearGradient>
      </defs>
      {/* ground shadow, light from the upper left */}
      <ellipse cx={cx + 22} cy={FRONT_Y + WALL_H + 4} rx={FRONT_HW + 22} ry={16} fill="#5b3f1f" opacity={0.28} filter="url(#pn-blur)" />
      {/* front wall with brick courses */}
      <rect x={cx - FRONT_HW} y={FRONT_Y} width={FRONT_HW * 2} height={WALL_H} fill="url(#pn-wall)" />
      <g stroke="#a7834f" strokeWidth={1} opacity={0.55}>
        <line x1={cx - FRONT_HW} x2={cx + FRONT_HW} y1={FRONT_Y + WALL_H / 2} y2={FRONT_Y + WALL_H / 2} />
        {Array.from({ length: 9 }, (_, i) => {
          const x = cx - FRONT_HW + ((i + 0.5) * FRONT_HW * 2) / 9;
          return <line key={i} x1={x} x2={x} y1={FRONT_Y + 1} y2={FRONT_Y + WALL_H / 2} />;
        })}
        {Array.from({ length: 8 }, (_, i) => {
          const x = cx - FRONT_HW + ((i + 1) * FRONT_HW * 2) / 9;
          return <line key={i} x1={x} x2={x} y1={FRONT_Y + WALL_H / 2} y2={FRONT_Y + WALL_H} />;
        })}
      </g>
      <rect x={cx - FRONT_HW} y={FRONT_Y + WALL_H - 5} width={FRONT_HW * 2} height={5} fill="#000" opacity={0.08} />
      {/* rim, inner walls, soil */}
      <polygon points={rim} fill="url(#pn-rim)" />
      <polygon points={opening} fill="#a98352" />
      <polygon points={soil} fill={`url(#pn-soil-${v.id})`} />
      <polygon points={soil} fill="url(#pn-grain-fill)" opacity={0.5} />
      {/* salt crust grows with soil ECe */}
      <polygon points={soil} fill="#f4efe4" style={{ opacity: salt * 0.6, transition: "opacity 1.2s" }} />
      <polygon points={soil} fill="url(#pn-salt)" style={{ opacity: salt, transition: "opacity 1.2s" }} />
      {/* furrows */}
      {[0.25, 0.5, 0.75].map((t) => {
        const l = soilPoint(cx, -0.92, t);
        const r = soilPoint(cx, 0.92, t);
        return (
          <g key={t}>
            <path d={`M${l.x},${l.y} Q${cx},${l.y + 4} ${r.x},${r.y}`} stroke={sc.furrow} strokeOpacity={0.35} strokeWidth={3} fill="none" strokeLinecap="round" />
            <path d={`M${l.x},${l.y - 3} Q${cx},${l.y + 1} ${r.x},${r.y - 3}`} stroke="#fff" strokeOpacity={0.08} strokeWidth={2} fill="none" strokeLinecap="round" />
          </g>
        );
      })}
      {irrigating && (
        <g>
          <polygon points={soil} fill="url(#pn-wet)" className="pulse-shimmer" />
          {[-0.5, 0.1, 0.6].map((u, i) => {
            const p = soilPoint(cx, u, 0.55 + (i % 2) * 0.2);
            return (
              <ellipse
                key={u}
                cx={p.x}
                cy={p.y}
                rx={34}
                ry={8}
                fill="none"
                stroke="#d5f1fb"
                strokeWidth={1.4}
                className="pulse-ripple"
                style={{ animationDelay: `${i * 0.7}s` }}
              />
            );
          })}
        </g>
      )}
      {SPROUTS.map(([u, t], i) => {
        const p = soilPoint(cx, u, t);
        return <Sprout key={i} x={p.x} y={p.y} color={plant} s={0.75 + t * 0.4} />;
      })}
      {/* rim highlight */}
      <path d={`M${cx - BACK_HW},${BACK_Y} L${cx + BACK_HW},${BACK_Y}`} stroke="#fff" strokeOpacity={0.5} strokeWidth={1.5} />
      <path d={`M${cx - FRONT_HW},${FRONT_Y} L${cx + FRONT_HW},${FRONT_Y}`} stroke="#fff" strokeOpacity={0.35} strokeWidth={1.5} />
      {/* soil moisture sensor with solar cap */}
      <g>
        <line x1={sensor.x} x2={sensor.x} y1={sensor.y + 10} y2={sensor.y - 34} stroke="#37474f" strokeWidth={3} strokeLinecap="round" />
        <rect x={sensor.x - 8} y={sensor.y - 50} width={16} height={20} rx={3.5} fill="url(#pn-device)" />
        <polygon points={`${sensor.x - 12},${sensor.y - 52} ${sensor.x + 12},${sensor.y - 56} ${sensor.x + 10},${sensor.y - 50} ${sensor.x - 14},${sensor.y - 46}`} fill="#1d3f66" stroke="#9fb8d0" strokeWidth={0.8} />
        <circle cx={sensor.x} cy={sensor.y - 40} r={2.8} fill={HEALTH_META[v.health].color} />
        <g transform={`translate(${sensor.x},${sensor.y - 62})`}>
          <path d="M-6,-1 a8,8 0 0 1 12,0" stroke="#2699c7" strokeWidth={1.6} fill="none" strokeLinecap="round" />
          <path d="M-11,-6 a15,15 0 0 1 22,0" stroke="#2699c7" strokeWidth={1.6} fill="none" strokeLinecap="round" className="pulse-ping" />
        </g>
      </g>
      {/* palm with soft crown shadow on the soil */}
      <ellipse cx={cx + 40} cy={BACK_Y + 70} rx={95} ry={18} fill="#1d140b" opacity={0.18} filter="url(#pn-blur)" />
      <Palm x={cx} baseY={BACK_Y + 58} height={212} health={v.health} />
      <polygon
        points={rim}
        fill="none"
        stroke={selected ? "#2699c7" : "#ffffff"}
        strokeWidth={selected ? 4 : 3}
        strokeDasharray={selected ? "10 6" : undefined}
        className="pn-outline transition-opacity"
        opacity={selected ? 1 : 0}
      />
    </g>
  );
}

/** A pipe drawn as a shaded cylinder. */
function PipeRun({ d, width = 15 }: { d: string; width?: number }) {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke="#0f3f5f" strokeWidth={width + 2} />
      <path d={d} stroke="#1a6a9a" strokeWidth={width} />
      <path d={d} stroke="#4cb1e0" strokeWidth={width * 0.28} transform={`translate(0,${-width * 0.22})`} opacity={0.85} />
    </g>
  );
}

function Valve({ x, y, open }: { x: number; y: number; open: boolean }) {
  const led = open ? "#38a169" : "#dc5b52";
  return (
    <g>
      <rect x={x - 13} y={y - 9} width={26} height={18} rx={4} fill="url(#pn-metal)" stroke="#2d3b43" strokeWidth={1} />
      <rect x={x - 17} y={y - 6} width={4} height={12} rx={1} fill="#46555e" />
      <rect x={x + 13} y={y - 6} width={4} height={12} rx={1} fill="#46555e" />
      {/* smart actuator */}
      <rect x={x - 10} y={y - 30} width={20} height={20} rx={4} fill="url(#pn-device)" />
      <circle cx={x} cy={y - 20} r={3.4} fill={led} style={{ transition: "fill 0.4s" }} />
      {open && <circle cx={x} cy={y - 20} r={6} fill="none" stroke={led} strokeWidth={1.5} className="pulse-ping" />}
    </g>
  );
}

function Pipes({ views, delayed }: { views: BasinDayView[]; delayed: boolean }) {
  const flowCls = delayed ? "pulse-delay-in" : undefined;
  const vol = Object.fromEntries(views.map((v) => [v.id, v.irrigation])) as Record<BasinId, number>;
  const start = TANK.x - TANK.rx - 52;
  const segments = [
    { from: start, to: BASIN_X.C, flow: vol.A + vol.B + vol.C },
    { from: BASIN_X.C, to: BASIN_X.B, flow: vol.A + vol.B },
    { from: BASIN_X.B, to: BASIN_X.A, flow: vol.A },
  ];
  return (
    <g>
      <ellipse cx={(start + 120) / 2} cy={PIPE_Y + 12} rx={(start - 120) / 2 + 20} ry={6} fill="#5b3f1f" opacity={0.18} filter="url(#pn-blur)" />
      <PipeRun d={`M${start},${PIPE_Y} L120,${PIPE_Y}`} />
      {Array.from({ length: 9 }, (_, i) => 160 + i * 95).map((x) => (
        <rect key={x} x={x} y={PIPE_Y - 10} width={8} height={20} rx={2} fill="#15557e" stroke="#0f3f5f" strokeWidth={1} />
      ))}
      <rect x={112} y={PIPE_Y - 11} width={10} height={22} rx={3} fill="#0f3f5f" />
      {segments.map(
        (s, i) =>
          s.flow > 1e-6 && (
            <g key={i} className={flowCls}>
            <path
              d={`M${s.from},${PIPE_Y - 1} L${s.to},${PIPE_Y - 1}`}
              stroke="#d9f4ff"
              strokeWidth={3.5}
              strokeLinecap="round"
              opacity={0.9}
              className="pulse-flow"
              style={{ animationDuration: flowDuration(s.flow) }}
            />
            </g>
          ),
      )}
      {views.map((v) => {
        const x = BASIN_X[v.id];
        const open = v.irrigation > 1e-6;
        const inlet = FRONT_Y + WALL_H - 4;
        return (
          <g key={v.id}>
            <PipeRun d={`M${x},${PIPE_Y} L${x},${inlet}`} width={11} />
            <circle cx={x} cy={PIPE_Y} r={10} fill="#15557e" stroke="#0f3f5f" strokeWidth={1.5} />
            {open && (
              <path
                className={`pulse-flow ${flowCls ?? ""}`}
                d={`M${x},${PIPE_Y} L${x},${inlet}`}
                stroke="#d9f4ff"
                strokeWidth={3}
                strokeLinecap="round"
                style={{ animationDuration: flowDuration(v.irrigation) }}
              />
            )}
            <Valve x={x} y={PIPE_Y - 34} open={open} />
            {/* outlet inside the basin */}
            <rect x={x - 7} y={FRONT_Y - 16} width={14} height={8} rx={2} fill="#15557e" />
            {open &&
              [0, 1, 2].map((i) => (
                <circle key={i} cx={x + (i - 1) * 6} cy={FRONT_Y - 22} r={2.6} fill="#9fe0f7" className="pulse-drop" style={{ animationDelay: `${i * 0.45}s` }} />
              ))}
          </g>
        );
      })}
    </g>
  );
}

function Reservoir({ level, flowing, inflow, outage }: { level: number; flowing: boolean; inflow: number; outage: boolean }) {
  const { x, top, bottom, rx, ry } = TANK;
  const l = Math.max(0.05, Math.min(1, level));
  const waterY = top + 6 + (1 - l) * 18;
  return (
    <g>
      <ellipse cx={x + 18} cy={bottom + 8} rx={rx + 30} ry={16} fill="#5b3f1f" opacity={0.3} filter="url(#pn-blur)" />
      <path d={`M${x - rx},${top} L${x - rx},${bottom} A${rx},${ry} 0 0 0 ${x + rx},${bottom} L${x + rx},${top}`} fill="url(#pn-tank)" />
      {[0.3, 0.62].map((t) => {
        const y = top + t * (bottom - top);
        return <path key={t} d={`M${x - rx},${y} A${rx},${ry} 0 0 0 ${x + rx},${y}`} stroke="#0c2a35" strokeOpacity={0.45} strokeWidth={2.5} fill="none" />;
      })}
      <path d={`M${x - rx},${bottom - 8} A${rx},${ry} 0 0 0 ${x + rx},${bottom - 8}`} stroke="#000" strokeOpacity={0.18} strokeWidth={6} fill="none" />
      {/* ladder */}
      <g stroke="#9fb3bd" strokeWidth={2}>
        <line x1={x + rx - 22} x2={x + rx - 22} y1={top + 6} y2={bottom + 10} />
        <line x1={x + rx - 10} x2={x + rx - 10} y1={top + 4} y2={bottom + 8} />
        {Array.from({ length: 7 }, (_, i) => (
          <line key={i} x1={x + rx - 22} x2={x + rx - 10} y1={top + 18 + i * 18} y2={top + 16 + i * 18} />
        ))}
      </g>
      {/* supply line from the source into the reservoir */}
      <g style={{ filter: outage ? "grayscale(0.9)" : undefined, transition: "filter 1s" }}>
        <PipeRun d={`M1210,270 L${x + 22},270 L${x + 22},${top - 2}`} width={11} />
        {inflow > 1e-6 && (
          <path
            d={`M1210,269 L${x + 22},269 L${x + 22},${top - 2}`}
            stroke="#d9f4ff"
            strokeWidth={3}
            strokeLinecap="round"
            fill="none"
            className="pulse-flow"
            style={{ animationDuration: flowDuration(inflow) }}
          />
        )}
      </g>
      {outage && (
        <g>
          <circle cx={x + 60} cy={270} r={11} fill="#dc5b52" stroke="#fff" strokeWidth={2} />
          <path d={`M${x + 55},265 L${x + 65},275 M${x + 65},265 L${x + 55},275`} stroke="#fff" strokeWidth={2.4} strokeLinecap="round" />
        </g>
      )}
      {/* rim + water */}
      <ellipse cx={x} cy={top} rx={rx} ry={ry} fill="#123542" />
      <ellipse cx={x} cy={top} rx={rx} ry={ry} fill="none" stroke="#6d8f9c" strokeWidth={4} />
      <ellipse cx={x} cy={waterY} rx={rx - 7} ry={ry - 5} fill="url(#pn-water)" style={{ transition: "cy 0.8s" }} />
      <ellipse cx={x} cy={waterY} rx={rx - 30} ry={ry - 11} fill="none" stroke="#d5f1fb" strokeWidth={1.2} className="pulse-ripple" />
      <ellipse cx={x - 18} cy={waterY - 2} rx={18} ry={3} fill="#fff" opacity={0.4} className="pulse-shimmer" />
      {/* pump */}
      <g>
        <rect x={x - rx - 62} y={PIPE_Y - 28} width={54} height={40} rx={7} fill="url(#pn-metal)" stroke="#2d3b43" />
        <rect x={x - rx - 56} y={PIPE_Y - 22} width={26} height={28} rx={13} fill="#2d3b43" />
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1={x - rx - 53 + i * 6} x2={x - rx - 53 + i * 6} y1={PIPE_Y - 18} y2={PIPE_Y + 2} stroke="#4f5f68" strokeWidth={2} />
        ))}
        <circle cx={x - rx - 18} cy={PIPE_Y - 16} r={4} fill={flowing ? "#38a169" : "#8a96a0"} />
      </g>
      <PipeRun d={`M${x - rx - 8},${PIPE_Y} L${x - rx + 14},${PIPE_Y} L${x - rx + 14},${bottom + 2}`} width={12} />
    </g>
  );
}

const DISTANT_PALMS: [number, number, number, number][] = [
  [40, 262, 0.55, 0.85],
  [118, 252, 0.42, 0.6],
  [404, 254, 0.4, 0.55],
  [700, 252, 0.44, 0.6],
  [990, 254, 0.42, 0.6],
  [1180, 262, 0.55, 0.85],
];

function Backdrop({ a }: { a: Atmosphere }) {
  return (
    <g>
      <rect width={W} height={H} fill="url(#pn-sky)" />
      <SkyTint a={a} />
      <Sun a={a} />
      <Clouds a={a} />
      <path d="M0,214 C120,190 240,206 360,198 C520,186 640,164 790,180 C930,194 1050,170 1200,184 L1200,290 L0,290 Z" fill="#ead2a3" opacity={0.6} />
      <path d="M0,236 C150,218 300,232 470,222 C640,212 770,200 930,214 C1050,224 1130,212 1200,218 L1200,300 L0,300 Z" fill="#e0bf88" opacity={0.75} />
      <g opacity={0.85}>
        {DISTANT_PALMS.map(([x, y, s, o], i) => (
          <g key={i} opacity={o}>
            <Palm x={x} baseY={y} height={105 * s} health="healthy" silhouette="#6f8c63" scale={s} sway={false} />
          </g>
        ))}
      </g>
      <path d="M0,258 C200,250 420,256 640,250 C860,244 1040,252 1200,248 L1200,560 L0,560 Z" fill="url(#pn-ground)" />
      <rect y={250} width={W} height={H - 250} fill="url(#pn-grain-fill)" opacity={0.6} />
      {/* low shrubs and stones */}
      {[
        [70, 330],
        [1180, 520],
        [40, 530],
        [690, 540],
      ].map(([x, y], i) => (
        <g key={i} transform={`translate(${x},${y})`}>
          <ellipse cx={4} cy={4} rx={26} ry={6} fill="#5b3f1f" opacity={0.18} />
          <path d="M-18,2 C-20,-10 -6,-16 0,-8 C4,-18 18,-14 18,0 Z" fill="#7d9a5a" />
          <path d="M-10,0 C-10,-8 0,-10 2,-4 C6,-10 12,-6 10,0 Z" fill="#9bb56c" />
        </g>
      ))}
      {[
        [210, 470, 9],
        [400, 520, 6],
        [980, 510, 8],
        [620, 300, 5],
      ].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx={r * 1.6} ry={r} fill="#c4a274" stroke="#ad8b5d" strokeWidth={1} />
      ))}
    </g>
  );
}

function Gateway() {
  const x = 1166;
  return (
    <g>
      <ellipse cx={x + 8} cy={478} rx={18} ry={5} fill="#5b3f1f" opacity={0.25} />
      <line x1={x} x2={x} y1={478} y2={262} stroke="#3a4a52" strokeWidth={4} />
      <polygon points={`${x - 18},${300} ${x + 18},${292} ${x + 16},${306} ${x - 20},${314}`} fill="#1d3f66" stroke="#9fb8d0" strokeWidth={1} />
      <rect x={x - 10} y={322} width={20} height={26} rx={4} fill="url(#pn-device)" />
      <circle cx={x} cy={334} r={3} fill="#38a169" />
      <line x1={x} x2={x + 10} y1={262} y2={244} stroke="#3a4a52" strokeWidth={2} />
      <circle cx={x} cy={262} r={20} fill="none" stroke="#2699c7" strokeWidth={1.8} className="pulse-ping" />
      <circle cx={x} cy={262} r={20} fill="none" stroke="#2699c7" strokeWidth={1.8} className="pulse-ping" style={{ animationDelay: "1.1s" }} />
    </g>
  );
}

function SceneDefs() {
  return (
    <defs>
      <linearGradient id="pn-sky" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#9fcbe0" />
        <stop offset="0.38" stopColor="#d9e8e4" />
        <stop offset="0.5" stopColor="#f3e6c9" />
        <stop offset="1" stopColor="#f3dcb0" />
      </linearGradient>
      <radialGradient id="pn-sun">
        <stop offset="0" stopColor="#fff2c2" stopOpacity="0.95" />
        <stop offset="0.4" stopColor="#fff2c2" stopOpacity="0.35" />
        <stop offset="1" stopColor="#fff2c2" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="pn-ground" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#ebd4a4" />
        <stop offset="1" stopColor="#d3ae75" />
      </linearGradient>
      <linearGradient id="pn-wall" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#d9bb86" />
        <stop offset="1" stopColor="#bb9762" />
      </linearGradient>
      <linearGradient id="pn-rim" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#f0dcb2" />
        <stop offset="1" stopColor="#d9bc88" />
      </linearGradient>
      <linearGradient id="pn-trunk" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#6f4724" />
        <stop offset="0.45" stopColor="#a8743f" />
        <stop offset="1" stopColor="#5e3a1c" />
      </linearGradient>
      <linearGradient id="pn-trunk-shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#1d140b" stopOpacity="0.35" />
        <stop offset="0.25" stopColor="#1d140b" stopOpacity="0" />
      </linearGradient>
      <radialGradient id="pn-dates" cx="0.35" cy="0.3">
        <stop offset="0" stopColor="#e9a14a" />
        <stop offset="1" stopColor="#9b4f1c" />
      </radialGradient>
      <linearGradient id="pn-tank" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0" stopColor="#173c4a" />
        <stop offset="0.35" stopColor="#3a7183" />
        <stop offset="0.55" stopColor="#2b5c6d" />
        <stop offset="1" stopColor="#102c37" />
      </linearGradient>
      <radialGradient id="pn-water" cx="0.4" cy="0.4">
        <stop offset="0" stopColor="#7fd6f4" />
        <stop offset="1" stopColor="#1f88b9" />
      </radialGradient>
      <radialGradient id="pn-wet" cx="0.5" cy="0.6" r="0.7">
        <stop offset="0" stopColor="#3aa9d6" stopOpacity="0.55" />
        <stop offset="1" stopColor="#3aa9d6" stopOpacity="0.12" />
      </radialGradient>
      <linearGradient id="pn-metal" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#c9d2d7" />
        <stop offset="0.5" stopColor="#8d9aa2" />
        <stop offset="1" stopColor="#5f6d75" />
      </linearGradient>
      <linearGradient id="pn-device" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3b4b54" />
        <stop offset="1" stopColor="#1b262c" />
      </linearGradient>
      <filter id="pn-blur" x="-30%" y="-100%" width="160%" height="300%">
        <feGaussianBlur stdDeviation="6" />
      </filter>
      <filter id="pn-haze">
        <feGaussianBlur stdDeviation="0.6" />
      </filter>
      <filter id="pn-grain" x="0" y="0" width="100%" height="100%">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" stitchTiles="stitch" seed="7" />
        <feColorMatrix type="matrix" values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.9 -0.35" />
      </filter>
      <WeatherDefs />
      <pattern id="pn-grain-fill" width="160" height="160" patternUnits="userSpaceOnUse">
        <rect width="160" height="160" filter="url(#pn-grain)" />
      </pattern>
    </defs>
  );
}

export function DigitalTwinScene() {
  const { result, running, runId, selectedDay, setSelectedDay, selectedBasin, setSelectedBasin, strategy, setStrategy, applied } =
    useSimulation();
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setSelectedDay((selectedDay % SIMULATION_DAYS) + 1), 1700);
    return () => clearInterval(id);
  }, [playing, selectedDay, setSelectedDay]);

  if (!result) {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <Skeleton className="aspect-[1200/560] w-full" />
        <p className="absolute inset-0 flex items-center justify-center text-sm text-pn-muted">جارٍ تحميل بيانات الطقس وتشغيل المحاكاة…</p>
      </div>
    );
  }

  const views = basinDayViews(result, strategy, selectedDay);
  const reservoir = reservoirOnDay(result, strategy, selectedDay);
  const atmo = atmosphereFor(result, selectedDay, Object.fromEntries(views.map((v) => [v.id, v.eceStart])));
  const weatherDay = result.weather.days[selectedDay - 1];
  const sceneVars = {
    "--sway-amp": `${(1.2 + atmo.wind * 4.5).toFixed(2)}deg`,
    "--sway-dur": `${(6 - atmo.wind * 4).toFixed(2)}s`,
    "--rain-dx": `${-(40 + atmo.wind * 260).toFixed(0)}px`,
  } as React.CSSProperties;
  const dayInfo = result.timeline[selectedDay - 1];
  const selected = views.find((v) => v.id === selectedBasin) ?? null;

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl ring-1 ring-black/5" dir="ltr">
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full select-none" preserveAspectRatio="xMidYMid slice" style={sceneVars} role="img" aria-label="التوأم الرقمي لثلاثة أحواض ري مع خزان مشترك">
          <SceneDefs />
          <Backdrop a={atmo} />
          <HeatShimmer a={atmo} />
          <Reservoir level={reservoir.level} flowing={reservoir.used > 1e-6} inflow={atmo.inflow} outage={atmo.outage} />
          <Pipes key={`${selectedDay}-${runId}`} views={views} delayed={atmo.delayHours > 0} />
          {views.map((v) => (
            <Basin key={v.id} v={v} salt={atmo.salt[v.id] ?? 0} selected={selectedBasin === v.id} onSelect={() => setSelectedBasin(selectedBasin === v.id ? null : v.id)} />
          ))}
          <Gateway />
          <Dust a={atmo} />
          <Rain a={atmo} />
          <DayCycle day={selectedDay} active={playing} />
        </svg>

        {/* HTML overlays positioned in viewBox percentages */}
        <div dir="rtl" className="pointer-events-none absolute end-3 top-3 rounded-2xl bg-white/80 px-4 py-2.5 text-start shadow-sm ring-1 ring-white/60 backdrop-blur-md sm:end-4 sm:top-4">
          <h2 className="text-base font-bold text-pn-navy sm:text-xl">محاكاة توزيع المياه بين الأحواض</h2>
          <p className="mt-0.5 hidden text-[11px] text-pn-deep/80 sm:block">اضغط على أي حوض لعرض تفاصيله · شاهد كيف تتغير القرارات عند تعديل الظروف</p>
        </div>

        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setSelectedBasin(selectedBasin === v.id ? null : v.id)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: pct(BASIN_X[v.id] - BACK_HW + 6, W), top: pct(BACK_Y - 6, H) }}
            aria-label={`تفاصيل ${v.name}`}
          >
            <span
              className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-white shadow-md ring-[3px] ring-white transition-colors duration-500 sm:h-10 sm:w-10 sm:text-lg"
              style={{ backgroundColor: HEALTH_META[v.health].color }}
            >
              {v.id}
            </span>
          </button>
        ))}

        {views.map((v) => (
          <div
            key={v.id}
            dir="rtl"
            className="pointer-events-none absolute hidden -translate-x-1/2 rounded-lg bg-white/90 px-2 py-1 text-[11px] leading-4 shadow-sm backdrop-blur xl:block"
            style={{ left: pct(BASIN_X[v.id] + 96, W), top: pct(232, H) }}
          >
            <div className="font-semibold text-pn-navy">
              رطوبة <span className="num">{fmt(v.moistureBefore, 0)}%</span>
              {v.irrigation > 1e-6 && (
                <>
                  {" "}← <span className="num text-pn-forest">{fmt(v.moistureAfter, 0)}%</span>
                </>
              )}
            </div>
            <div className={v.irrigation > 1e-6 ? "text-pn-water" : "text-pn-muted"}>
              {v.irrigation > 1e-6 ? (
                <>
                  ري <span className="num font-semibold">{fmt(v.irrigation)}</span> م³
                </>
              ) : (
                "الصمام مغلق"
              )}
            </div>
          </div>
        ))}

        <div
          dir="rtl"
          className="pointer-events-none absolute -translate-x-1/2 rounded-xl bg-white/95 px-3 py-2 shadow-md"
          style={{ left: pct(TANK.x - 6, W), top: pct(176, H) }}
        >
          <div className="text-[10px] text-pn-muted sm:text-[11px]">المياه المتاحة</div>
          <div className="flex items-baseline gap-1 text-pn-navy">
            <span className="num text-base font-bold sm:text-xl">{fmt(applied.availableWater, 0)}</span>
            <span className="text-xs">م³</span>
          </div>
          <div className="hidden text-[10px] text-pn-water xl:block">
            في الخزان اليوم <span className="num font-semibold">{fmt(reservoir.stock)}</span> م³
          </div>
        </div>

        {atmo.outage && (
          <div
            dir="rtl"
            className="pulse-pop pointer-events-none absolute -translate-x-1/2 rounded-full bg-pn-danger px-3 py-1 text-[11px] font-bold text-white whitespace-nowrap shadow-md"
            style={{ left: pct(TANK.x, W), top: pct(TANK.bottom + 28, H) }}
          >
            <span className="flex items-center gap-1">
              <PlugZap size={12} /> انقطاع الإمداد
            </span>
          </div>
        )}
        {atmo.delayHours > 0 && (
          <div
            dir="rtl"
            className="pulse-pop pointer-events-none absolute -translate-x-1/2 rounded-full bg-pn-navy/90 px-3 py-1 text-[11px] font-semibold text-white shadow-md"
            style={{ left: pct(TANK.x - TANK.rx - 35, W), top: pct(PIPE_Y + 26, H) }}
          >
            <span className="flex items-center gap-1.5">
              <Clock size={12} className="animate-spin [animation-duration:2.5s]" /> تأخر المناوبة <span className="num">{atmo.delayHours}</span> س
            </span>
          </div>
        )}
        <div
          dir="rtl"
          className="pointer-events-none absolute bottom-2 left-2 hidden items-center gap-3 rounded-full bg-white/80 px-3 py-1 text-[11px] text-pn-navy shadow-sm backdrop-blur sm:flex"
        >
          <span className="flex items-center gap-1">
            <Thermometer size={12} className="text-pn-warning" /> <span className="num font-semibold">{fmt(weatherDay.tMax, 0)}°</span>
          </span>
          <span className="flex items-center gap-1">
            <Wind size={12} className="text-pn-muted" /> <span className="num font-semibold">{fmt(weatherDay.wind)}</span> م/ث
          </span>
          <span className="flex items-center gap-1">
            <Droplet size={12} className="text-pn-water" /> <span className="num font-semibold">{fmt(weatherDay.rain)}</span> مم
          </span>
          {atmo.dust > 0 && <span className="font-semibold text-[#9a6b2e]">غبار</span>}
        </div>

        {running && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/30 backdrop-blur-[1px]">
            <span dir="rtl" className="flex items-center gap-2 rounded-full bg-pn-navy px-4 py-2 text-sm text-white shadow-lg">
              <Radio size={16} className="animate-pulse" /> جارٍ إعادة حساب المحاكاة…
            </span>
          </div>
        )}

        {selected && <BasinDetailPanel view={selected} onClose={() => setSelectedBasin(null)} />}
      </div>

      {/* timeline */}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-pn-navy text-white shadow hover:bg-pn-deep"
          aria-label={playing ? "إيقاف التشغيل" : "تشغيل الأيام تلقائياً"}
        >
          {playing ? <Pause size={16} /> : <Play size={16} className="-scale-x-100" />}
        </button>
        <div className="grid min-w-[260px] flex-1 grid-cols-7 gap-1" role="tablist" aria-label="يوم المحاكاة">
          {result.timeline.map((t) => (
            <button
              key={t.day}
              type="button"
              role="tab"
              aria-selected={selectedDay === t.day}
              onClick={() => {
                setPlaying(false);
                setSelectedDay(t.day);
              }}
              className={`min-w-0 rounded-lg border px-1 py-1 text-center text-xs transition-colors ${
                selectedDay === t.day
                  ? "border-pn-forest bg-pn-forest text-white"
                  : "border-pn-line bg-white text-pn-ink hover:border-pn-forest/40"
              }`}
            >
              <div className="truncate font-semibold">
                <span className="hidden sm:inline">اليوم </span>
                <span className="sm:hidden">ي</span>
                {t.day}
              </div>
              <div className={`hidden truncate text-[10px] sm:block ${selectedDay === t.day ? "text-white/80" : "text-pn-muted"}`}>{shortDateAr(t.date)}</div>
            </button>
          ))}
        </div>
        <div className="flex rounded-lg border border-pn-line bg-white p-0.5 text-xs" role="radiogroup" aria-label="نظام الري المعروض">
          {(["pulse", "traditional"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={strategy === s}
              onClick={() => setStrategy(s)}
              className={`rounded-md px-3 py-1.5 font-semibold transition-colors ${strategy === s ? "bg-pn-navy text-white" : "text-pn-muted hover:text-pn-navy"}`}
            >
              {s === "pulse" ? "Pulse" : "الري التقليدي"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-pn-muted">
        {(["healthy", "moderate", "critical"] as const).map((h) => (
          <span key={h} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: HEALTH_META[h].color }} />
            {HEALTH_META[h].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="h-1 w-5 rounded-full" style={{ backgroundColor: COLORS.water }} /> تدفق المياه
        </span>
        <span className="ms-auto">
          وصل إلى الخزان اليوم <span className="num font-semibold text-pn-navy">{fmt(dayInfo.delivered)}</span> م³ · ET0{" "}
          <span className="num font-semibold text-pn-navy">{fmt(dayInfo.et0)}</span> مم
        </span>
      </div>
    </div>
  );
}
