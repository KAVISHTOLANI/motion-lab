import { useEffect, useMemo, useRef, useState } from 'react';
import { DemoTag, Landing, NotFound, Notice, PageHead, prefersReducedMotion, Shell, uid, usePersistentState, useRoute } from './shared/ui';
import { explain, LIMITS, PLANETS, position, solve, trajectory, validate, type Launch } from './lib/physics';

const NAV = [
  { to: '/', label: 'Overview' },
  { to: '/lab', label: 'Simulator' },
  { to: '/physics', label: 'The physics' },
];
const COLORS = ['#b45309', '#0f766e', '#be185d'];

interface Pinned {
  id: string;
  label: string;
  launch: Launch;
  color: string;
  demo?: boolean;
}

const DEMO_PINS: Pinned[] = [
  { id: 'demo-30', label: '20 m/s at 30° · Earth', launch: { v: 20, angle: 30, g: 9.81, h: 0 }, color: COLORS[0], demo: true },
  { id: 'demo-moon', label: '20 m/s at 45° · Moon', launch: { v: 20, angle: 45, g: 1.62, h: 0 }, color: COLORS[1], demo: true },
];

export default function App() {
  const [route] = useRoute();
  let page;
  if (route === '/') page = <Home />;
  else if (route === '/lab') page = <Lab />;
  else if (route === '/physics') page = <Physics />;
  else page = <NotFound />;
  return (
    <Shell name="Motion Lab" wordmark={['Motion', 'Lab']} nav={NAV} route={route} cta={{ to: '/lab', label: 'Open simulator' }} footerNote="An idealised model: no air resistance, flat ground.">
      {page}
    </Shell>
  );
}

function niceStep(max: number) {
  const raw = max / 5;
  const p = 10 ** Math.floor(Math.log10(raw || 1));
  return [1, 2, 5, 10].map((m) => m * p).find((s) => s >= raw) ?? p * 10;
}

function Plot({ launch, t, pinned = [], height = 340 }: { launch: Launch; t: number; pinned?: Pinned[]; height?: number }) {
  const r = solve(launch);
  const all = [launch, ...pinned.map((p) => p.launch)].map(solve);
  const xmax = Math.max(1, ...all.map((a) => a.range)) * 1.08;
  const ymax = Math.max(1, ...all.map((a) => a.maxHeight)) * 1.15;
  const W = 800, H = 400, P = { l: 48, r: 16, t: 16, b: 36 };
  const sx = (x: number) => P.l + (x / xmax) * (W - P.l - P.r);
  const sy = (y: number) => H - P.b - (y / ymax) * (H - P.t - P.b);
  const path = (l: Launch) => trajectory(l, 120).map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(' ');
  const pos = position(launch, t);
  const xs = niceStep(xmax), ys = niceStep(ymax);
  const traced = trajectory(launch, 120).filter((_, i) => (i / 120) * r.flightTime <= t);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="plot" style={{ maxHeight: height }} role="img" aria-label={`Trajectory: range ${r.range.toFixed(1)} metres, maximum height ${r.maxHeight.toFixed(1)} metres, flight time ${r.flightTime.toFixed(2)} seconds.`}>
      {Array.from({ length: Math.floor(xmax / xs) + 1 }, (_, i) => i * xs).map((x) => (
        <g key={`x${x}`}><line x1={sx(x)} x2={sx(x)} y1={sy(0)} y2={P.t} className="grid" /><text x={sx(x)} y={H - P.b + 18} className="tick" textAnchor="middle">{x}</text></g>
      ))}
      {Array.from({ length: Math.floor(ymax / ys) + 1 }, (_, i) => i * ys).map((y) => (
        <g key={`y${y}`}><line x1={P.l} x2={W - P.r} y1={sy(y)} y2={sy(y)} className="grid" /><text x={P.l - 8} y={sy(y) + 4} className="tick" textAnchor="end">{y}</text></g>
      ))}
      <line x1={P.l} x2={W - P.r} y1={sy(0)} y2={sy(0)} className="ground" />
      <text x={W - P.r} y={H - 4} className="axis-label" textAnchor="end">distance (m)</text>
      <text x={8} y={P.t + 4} className="axis-label">height (m)</text>
      {pinned.map((p) => <path key={p.id} d={path(p.launch)} className="pinned" stroke={p.color} />)}
      <path d={path(launch)} className="ghost" />
      {traced.length > 1 && <path d={traced.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x)},${sy(p.y)}`).join(' ') + ` L${sx(pos.x)},${sy(pos.y)}`} className="traced" />}
      {r.vy > 0 && (
        <g>
          <circle cx={sx(r.vx * r.apexTime)} cy={sy(r.maxHeight)} r={4} className="apex" />
          <text x={sx(r.vx * r.apexTime)} y={sy(r.maxHeight) - 10} className="note" textAnchor="middle">max {r.maxHeight.toFixed(1)} m</text>
        </g>
      )}
      <circle cx={sx(pos.x)} cy={sy(pos.y)} r={9} className="ball" />
      <text x={sx(r.range)} y={sy(0) - 8} className="note" textAnchor="end">{r.range.toFixed(1)} m</text>
    </svg>
  );
}

function useAnimation(duration: number, autoplay: boolean) {
  const [t, setT] = useState(autoplay ? 0 : duration);
  const [playing, setPlaying] = useState(autoplay);
  const last = useRef<number | null>(null);
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    const step = (now: number) => {
      const dt = last.current == null ? 0 : (now - last.current) / 1000;
      last.current = now;
      setT((x) => {
        const n = x + dt * Math.max(1, duration / 4); // finish any flight in ~4 s
        if (n >= duration) {
          setPlaying(false);
          return duration;
        }
        return n;
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(raf);
      last.current = null;
    };
  }, [playing, duration]);
  return { t: Math.min(t, duration), setT, playing, play: () => { if (t >= duration) setT(0); setPlaying(true); }, pause: () => setPlaying(false) };
}

function Home() {
  const launch = { v: 22, angle: 50, g: 9.81, h: 0 };
  const r = solve(launch);
  const anim = useAnimation(r.flightTime, !prefersReducedMotion());
  useEffect(() => {
    if (anim.playing || prefersReducedMotion()) return;
    const id = setTimeout(anim.play, 1500);
    return () => clearTimeout(id);
  });
  return (
    <Landing
      eyebrow="Physics simulator · projectile motion"
      title={<>Throw a ball <em>on any planet.</em></>}
      lead="Set the launch speed, angle, gravity and height, watch the flight unfold, and read every number that matters — range, maximum height, time in the air — with a plain-language explanation of why."
      primary={{ href: '#/lab', label: 'Open the simulator' }}
      secondary={{ href: '#/physics', label: 'The physics' }}
      previewLabel="22 m/s at 50° on Earth"
      preview={<div className="hero-plot"><Plot launch={launch} t={anim.t} height={260} /></div>}
      steps={[
        { title: 'Set the launch', body: 'Sliders or exact numbers for speed, angle, gravity and launch height.' },
        { title: 'Watch it fly', body: 'Play, pause and scrub through time; the ball and its path are drawn to scale.' },
        { title: 'Compare', body: 'Pin up to three throws to see how angle or gravity changes the curve.' },
      ]}
      features={[
        { title: 'Exact values', body: 'Range, peak height, time to peak, flight time, impact speed and angle.' },
        { title: 'Planet presets', body: 'Earth, Moon, Mars and Jupiter gravity — or type your own.' },
        { title: 'Plain explanations', body: 'Why the horizontal speed stays constant, and how gravity shapes the arc.' },
        { title: 'Readable charts', body: 'Labelled axes in metres, an apex marker and a range label.' },
      ]}
      note="The model ignores air resistance, spin and the curvature of the ground. Real projectiles fall short of these ranges, especially at high speeds."
      closing={{ title: <>Find the angle that <em>goes furthest.</em></>, action: { href: '#/lab', label: 'Open the simulator' } }}
    />
  );
}

function Lab() {
  const [form, setForm] = usePersistentState<Record<keyof Launch, string>>('motion:form', { v: '20', angle: '45', g: '9.81', h: '0' });
  const [pins, setPins] = usePersistentState<Pinned[]>('motion:pins', DEMO_PINS);
  const errors = validate(form);
  const valid = Object.keys(errors).length === 0;
  const [launch, setLaunch] = useState<Launch>(() => (valid ? { v: +form.v, angle: +form.angle, g: +form.g, h: +form.h } : { v: 20, angle: 45, g: 9.81, h: 0 }));
  useEffect(() => {
    if (valid) setLaunch({ v: +form.v, angle: +form.angle, g: +form.g, h: +form.h });
  }, [form, valid]);
  const r = useMemo(() => solve(launch), [launch]);
  const anim = useAnimation(r.flightTime, false);
  useEffect(() => anim.setT(r.flightTime), [r.flightTime]); // eslint-disable-line react-hooks/exhaustive-deps
  const planet = PLANETS.find((p) => Math.abs(p.g - launch.g) < 0.001);
  const pos = position(launch, anim.t);
  const set = (k: keyof Launch, v: string) => setForm({ ...form, [k]: v });

  const control = (k: keyof Launch, label: string, unit: string, step: number) => (
    <div className="ctrl">
      <div className="ctrl-head">
        <label htmlFor={`n-${k}`}>{label}</label>
        <span className="row"><input id={`n-${k}`} type="number" step={step} min={LIMITS[k][0]} max={LIMITS[k][1]} value={form[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={errors[k] ? true : undefined} aria-describedby={errors[k] ? `e-${k}` : undefined} /><span className="unit">{unit}</span></span>
      </div>
      <input type="range" aria-label={`${label} slider`} min={LIMITS[k][0]} max={LIMITS[k][1]} step={step} value={Number.isFinite(+form[k]) ? form[k] : LIMITS[k][0]} onChange={(e) => set(k, e.target.value)} />
      {errors[k] && <span className="error-text" id={`e-${k}`}>{errors[k]}</span>}
    </div>
  );

  return (
    <div className="stack">
      <PageHead
        eyebrow="Simulator"
        title={<>Projectile <em>motion</em></>}
        description={planet ? `Gravity: ${planet.name}` : `Custom gravity: ${launch.g} m/s²`}
        actions={
          <>
            <button type="button" className="btn btn-primary" onClick={anim.playing ? anim.pause : anim.play}>{anim.playing ? 'Pause' : anim.t >= r.flightTime ? 'Replay' : 'Play'}</button>
            <button type="button" className="btn" disabled={pins.length >= 3} onClick={() => setPins([...pins, { id: uid('p'), label: `${launch.v} m/s at ${launch.angle}°${launch.h ? ` from ${launch.h} m` : ''} · ${planet?.name ?? `g=${launch.g}`}`, launch, color: COLORS.find((c) => !pins.some((p) => p.color === c)) ?? COLORS[0] }])}>Pin for comparison</button>
          </>
        }
      />
      {!valid && <Notice kind="error">Showing the last valid launch. Fix the highlighted values to update the simulation.</Notice>}
      <div className="lab">
        <section className="card stack controls" aria-label="Launch settings">
          {control('v', 'Launch speed', 'm/s', 0.5)}
          {control('angle', 'Angle', '°', 1)}
          {control('h', 'Launch height', 'm', 1)}
          {control('g', 'Gravity', 'm/s²', 0.01)}
          <div className="planets" role="group" aria-label="Gravity presets">
            {PLANETS.map((p) => <button key={p.id} type="button" className={`chip ${planet?.id === p.id ? 'on' : ''}`} aria-pressed={planet?.id === p.id} onClick={() => set('g', String(p.g))}>{p.name}</button>)}
          </div>
        </section>
        <div className="stack">
          <section className="card plot-card">
            <Plot launch={launch} t={anim.t} pinned={pins} />
            <div className="scrub">
              <label htmlFor="time" className="small">Time</label>
              <input id="time" type="range" min={0} max={r.flightTime} step={r.flightTime / 200} value={anim.t} onChange={(e) => { anim.pause(); anim.setT(+e.target.value); }} aria-valuetext={`${anim.t.toFixed(2)} seconds`} />
              <span className="small mono" data-testid="clock">t = {anim.t.toFixed(2)} s · x = {pos.x.toFixed(1)} m · y = {pos.y.toFixed(1)} m</span>
            </div>
            {pins.length > 0 && (
              <ul className="pins">
                <li><span className="swatch current" /> Current</li>
                {pins.map((p) => (
                  <li key={p.id}>
                    <span className="swatch" style={{ borderColor: p.color }} /> {p.label} {p.demo && <DemoTag />}
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPins(pins.filter((x) => x.id !== p.id))} aria-label={`Remove ${p.label}`}>✕</button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div className="stats">
            <div className="stat"><div className="stat-label">Range</div><div className="stat-value" data-testid="range">{r.range.toFixed(1)} m</div></div>
            <div className="stat"><div className="stat-label">Max height</div><div className="stat-value">{r.maxHeight.toFixed(1)} m</div></div>
            <div className="stat"><div className="stat-label">Flight time</div><div className="stat-value">{r.flightTime.toFixed(2)} s</div></div>
            <div className="stat"><div className="stat-label">Impact speed</div><div className="stat-value">{r.impactSpeed.toFixed(1)} m/s</div></div>
          </div>
          <section className="card">
            <h2>What’s happening</h2>
            <ol className="explain">{explain(launch, r, planet?.name === 'Moon' ? 'the Moon' : planet?.name).map((s) => <li key={s}>{s}</li>)}</ol>
            <p className="hint">Time to peak {r.apexTime.toFixed(2)} s · hits the ground at {r.impactAngle.toFixed(1)}° below horizontal.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

function Physics() {
  return (
    <div className="stack narrow">
      <PageHead eyebrow="Reference" title={<>The <em>physics</em></>} description="The equations behind the simulator, for a launch at speed v, angle θ, gravity g and height h." />
      <div className="card prose">
        <h2>Splitting the velocity</h2>
        <p className="formula">vₓ = v · cos θ &nbsp;&nbsp; vᵧ = v · sin θ</p>
        <h2>Position over time</h2>
        <p className="formula">x(t) = vₓ · t &nbsp;&nbsp; y(t) = h + vᵧ · t − ½ · g · t²</p>
        <h2>Key results</h2>
        <ul>
          <li>Time to peak: <span className="formula">t = vᵧ / g</span></li>
          <li>Maximum height: <span className="formula">h + vᵧ² / (2g)</span></li>
          <li>Flight time (back to y = 0): <span className="formula">(vᵧ + √(vᵧ² + 2gh)) / g</span></li>
          <li>Range: <span className="formula">vₓ × flight time</span>. From the ground this simplifies to v² · sin 2θ / g, which is largest at 45°.</li>
        </ul>
        <h2>Assumptions</h2>
        <p>No air resistance or wind, constant gravity, flat ground, and the projectile treated as a point. These make the maths exact but overestimate real ranges — a thrown ball or a kicked football falls noticeably shorter.</p>
      </div>
    </div>
  );
}
