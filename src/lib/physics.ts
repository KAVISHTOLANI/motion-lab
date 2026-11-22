export interface Launch {
  v: number; // m/s
  angle: number; // degrees above horizontal
  g: number; // m/s²
  h: number; // launch height, m
}

export interface Result {
  vx: number;
  vy: number;
  flightTime: number;
  range: number;
  maxHeight: number;
  apexTime: number;
  impactSpeed: number;
  impactAngle: number; // degrees below horizontal
}

const rad = (d: number) => (d * Math.PI) / 180;

/** Ideal projectile motion (no air resistance) from a launch height h ≥ 0 to ground level y = 0. */
export function solve({ v, angle, g, h }: Launch): Result {
  const vx = v * Math.cos(rad(angle));
  const vy = v * Math.sin(rad(angle));
  // y(t) = h + vy t − ½ g t² = 0  →  t = (vy + √(vy² + 2gh)) / g
  const flightTime = (vy + Math.sqrt(vy * vy + 2 * g * h)) / g;
  const apexTime = Math.max(0, vy / g);
  const maxHeight = h + (vy > 0 ? (vy * vy) / (2 * g) : 0);
  const vyImpact = vy - g * flightTime;
  return {
    vx,
    vy,
    flightTime,
    range: vx * flightTime,
    maxHeight,
    apexTime,
    impactSpeed: Math.hypot(vx, vyImpact),
    impactAngle: (Math.atan2(-vyImpact, vx) * 180) / Math.PI,
  };
}

export function position(l: Launch, t: number): { x: number; y: number } {
  const r = solve(l);
  const tt = Math.min(Math.max(t, 0), r.flightTime);
  return { x: r.vx * tt, y: Math.max(0, l.h + r.vy * tt - 0.5 * l.g * tt * tt) };
}

export function trajectory(l: Launch, steps = 80): { x: number; y: number }[] {
  const r = solve(l);
  return Array.from({ length: steps + 1 }, (_, i) => position(l, (i / steps) * r.flightTime));
}

export const PLANETS = [
  { id: 'earth', name: 'Earth', g: 9.81 },
  { id: 'moon', name: 'Moon', g: 1.62 },
  { id: 'mars', name: 'Mars', g: 3.71 },
  { id: 'jupiter', name: 'Jupiter', g: 24.79 },
];

export const LIMITS = { v: [0.5, 150], angle: [0, 90], g: [0.5, 50], h: [0, 300] } as const;

export function validate(input: Record<keyof Launch, string>): Partial<Record<keyof Launch, string>> {
  const e: Partial<Record<keyof Launch, string>> = {};
  const labels: Record<keyof Launch, string> = { v: 'Launch speed', angle: 'Angle', g: 'Gravity', h: 'Launch height' };
  (Object.keys(LIMITS) as (keyof Launch)[]).forEach((k) => {
    const n = Number(input[k]);
    const [lo, hi] = LIMITS[k];
    if (input[k].trim() === '' || !Number.isFinite(n)) e[k] = `${labels[k]} must be a number.`;
    else if (n < lo || n > hi) e[k] = `${labels[k]} must be between ${lo} and ${hi}.`;
  });
  if (!e.angle && !e.h && Number(input.angle) === 0 && Number(input.h) === 0) e.h = 'At 0° from the ground the projectile never leaves it — raise the angle or the launch height.';
  return e;
}

/** Plain-language explanation of what happened and why. */
export function explain(l: Launch, r: Result, planet?: string): string[] {
  const out = [
    `The launch speed splits into a horizontal part of ${r.vx.toFixed(1)} m/s and a vertical part of ${r.vy.toFixed(1)} m/s (using the ${l.angle}° angle).`,
    `Without air resistance, nothing slows the horizontal motion, so the projectile moves sideways at a steady ${r.vx.toFixed(1)} m/s the whole time.`,
  ];
  if (r.vy > 0) out.push(`Gravity${planet ? ` on ${planet}` : ''} (${l.g} m/s²) removes ${l.g} m/s of upward speed every second, so it stops rising after ${r.apexTime.toFixed(2)} s at ${r.maxHeight.toFixed(1)} m.`);
  else out.push(`Launched horizontally, it starts falling straight away; gravity adds ${l.g} m/s of downward speed every second.`);
  out.push(`It is in the air for ${r.flightTime.toFixed(2)} s, so it travels ${r.vx.toFixed(1)} × ${r.flightTime.toFixed(2)} ≈ ${r.range.toFixed(1)} m.`);
  if (l.h === 0 && Math.abs(l.angle - 45) < 0.01) out.push('From ground level, 45° gives the longest range for a given speed.');
  else if (l.h === 0) out.push(`From ground level, ${l.angle}° and ${90 - l.angle}° give the same range — try it.`);
  return out;
}
