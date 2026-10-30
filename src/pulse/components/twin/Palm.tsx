// Procedural date palm: shaded trunk with chevron leaf bases, layered pinnate fronds and date clusters.

import type { BasinHealth } from "../../engine";

interface FrondPalette {
  back: string;
  mid: string;
  front: string;
  spine: string;
}

export const LEAF_COLORS: Record<BasinHealth, FrondPalette> = {
  healthy: { back: "#245c2f", mid: "#337d3a", front: "#4f9c45", spine: "#1f4f28" },
  moderate: { back: "#5f6c26", mid: "#7f8d31", front: "#a0ab45", spine: "#4d5820" },
  critical: { back: "#7b5d25", mid: "#9a7a35", front: "#bb9b4e", spine: "#5f4719" },
};

interface Pt {
  x: number;
  y: number;
}

const quad = (p0: Pt, p1: Pt, p2: Pt, t: number): Pt => {
  const u = 1 - t;
  return { x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x, y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y };
};

const tangent = (p0: Pt, p1: Pt, p2: Pt, t: number): Pt => {
  const x = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const y = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  const l = Math.hypot(x, y) || 1;
  return { x: x / l, y: y / l };
};

const f1 = (n: number) => n.toFixed(1);

/** A frond as one filled path of tapered leaflets plus its midrib. */
export function frondPaths(crown: Pt, angleDeg: number, length: number, droop: number, density = 0.058) {
  const a = (angleDeg * Math.PI) / 180;
  const dir = { x: Math.cos(a), y: Math.sin(a) };
  const p2 = { x: crown.x + dir.x * length, y: crown.y + dir.y * length + droop * length };
  const p1 = { x: crown.x + dir.x * length * 0.55, y: crown.y + dir.y * length * 0.55 - length * 0.16 };
  const spine = `M${f1(crown.x)},${f1(crown.y)} Q${f1(p1.x)},${f1(p1.y)} ${f1(p2.x)},${f1(p2.y)}`;
  let leaves = "";
  for (let t = 0.08; t <= 0.985; t += density) {
    const p = quad(crown, p1, p2, t);
    const tn = tangent(crown, p1, p2, t);
    const n = { x: -tn.y, y: tn.x };
    const len = length * 0.27 * Math.pow(Math.sin(Math.PI * Math.min(0.98, t * 1.04)), 0.5) + 2.5;
    const w = 3.1 * (1 - t * 0.55);
    for (const side of [1, -1]) {
      const tip = {
        x: p.x + side * n.x * len + tn.x * len * 0.62,
        y: p.y + side * n.y * len + tn.y * len * 0.62 + len * (0.25 + droop * 0.5),
      };
      leaves += `M${f1(p.x - tn.x * w)},${f1(p.y - tn.y * w)} L${f1(tip.x)},${f1(tip.y)} L${f1(p.x + tn.x * w)},${f1(p.y + tn.y * w)} Z `;
    }
  }
  return { spine, leaves };
}

// [angle°, length factor, extra droop] per layer, drawn back → front.
const BACK: [number, number, number][] = [
  [-152, 1.0, 0.05],
  [-124, 1.05, 0],
  [-98, 1.0, 0],
  [-74, 1.05, 0],
  [-44, 1.0, 0.05],
];
const MID: [number, number, number][] = [
  [-178, 1.0, 0.22],
  [-138, 0.95, 0.06],
  [-110, 0.9, 0],
  [-84, 0.92, 0],
  [-58, 0.95, 0.04],
  [-14, 1.0, 0.24],
];
const FRONT: [number, number, number][] = [
  [172, 0.92, 0.42],
  [148, 0.78, 0.48],
  [8, 0.92, 0.42],
  [32, 0.78, 0.48],
  [-160, 0.8, 0.18],
  [-30, 0.8, 0.18],
];

export function Palm({
  x,
  baseY,
  height,
  health,
  silhouette,
  scale = 1,
  sway = true,
}: {
  x: number;
  baseY: number;
  height: number;
  health: BasinHealth;
  /** Single flat colour for distant palms. */
  silhouette?: string;
  scale?: number;
  sway?: boolean;
}) {
  const top = baseY - height;
  const pal = LEAF_COLORS[health];
  const stress = health === "critical" ? 0.32 : health === "moderate" ? 0.16 : 0;
  const L = 112 * scale;
  const crown = { x, y: top };
  const tw = 12 * scale;
  // Slight lean for a natural silhouette.
  const lean = 6 * scale;

  const trunk = `M${x - tw},${baseY} C${x - tw * 0.95},${baseY - height * 0.4} ${x - tw * 0.6 + lean},${top + height * 0.25} ${x - tw * 0.55 + lean * 0.2},${top + 4} L${x + tw * 0.55 + lean * 0.2},${top + 4} C${x + tw * 0.6 + lean},${top + height * 0.25} ${x + tw * 0.95},${baseY - height * 0.4} ${x + tw},${baseY} Z`;

  const scales: string[] = [];
  if (!silhouette) {
    const step = 9 * scale;
    for (let y = top + 12 * scale; y < baseY - 6; y += step) {
      const k = (y - top) / height;
      const cx = x + lean * (1 - k) * 0.6;
      const w = (tw * 0.55 + tw * 0.45 * k) * 0.95;
      scales.push(`M${f1(cx - w)},${f1(y - 3)} L${f1(cx)},${f1(y + 4 * scale)} L${f1(cx + w)},${f1(y - 3)} L${f1(cx + w)},${f1(y)} L${f1(cx)},${f1(y + 7 * scale)} L${f1(cx - w)},${f1(y)} Z`);
    }
  }

  const layer = (spec: [number, number, number][], color: string, key: string) =>
    spec.map(([angle, lf, d], i) => {
      const { spine, leaves } = frondPaths(crown, angle, L * lf, d + stress, silhouette ? 0.09 : 0.058);
      return (
        <g key={`${key}${i}`}>
          <path d={leaves} fill={color} />
          {!silhouette && <path d={spine} stroke={pal.spine} strokeWidth={1.6 * scale} fill="none" strokeLinecap="round" />}
        </g>
      );
    });

  return (
    <g>
      <path d={trunk} fill={silhouette ?? "url(#pn-trunk)"} />
      {scales.length > 0 && <path d={scales.join(" ")} fill="#5e3b1d" opacity={0.42} />}
      {!silhouette && <path d={trunk} fill="url(#pn-trunk-shade)" />}
      <g className={sway ? "pulse-sway" : undefined} style={{ transformOrigin: `${x}px ${top}px` }}>
        {layer(BACK, silhouette ?? pal.back, "b")}
        {!silhouette && (
          <g>
            {[
              [-15, 16, 6.5],
              [12, 18, 6],
              [-3, 22, 7],
            ].map(([dx, dy, r], i) => (
              <g key={i}>
                <path d={`M${x + dx * 0.4},${top + 4} Q${x + dx},${top + dy * 0.4} ${x + dx},${top + dy}`} stroke="#b9782f" strokeWidth={1.4} fill="none" />
                <ellipse cx={x + dx} cy={top + dy + r} rx={r * scale} ry={r * 1.25 * scale} fill="url(#pn-dates)" />
              </g>
            ))}
          </g>
        )}
        {layer(MID, silhouette ?? pal.mid, "m")}
        {layer(FRONT, silhouette ?? pal.front, "f")}
        {!silhouette && <circle cx={x} cy={top + 1} r={6 * scale} fill={pal.back} />}
      </g>
    </g>
  );
}
