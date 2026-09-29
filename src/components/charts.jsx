import { useRef, useState } from 'react';

// Series colors validated for colorblind separation (amber vs. slate blue).
export const SERIES = ['#E58A00', '#3B5BA9'];

function niceMax(v) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

const fmtAxis = (v, money) => {
  const s = v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}K` : `${Math.round(v)}`;
  return money ? `₱${s}` : s;
};

// Line chart with shared crosshair tooltip. One y-axis only; series share a unit.
export function LineChart({ data, series, height = 220, money = true }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 640;
  const H = height;
  const pad = { l: 48, r: 12, t: 12, b: 26 };
  const max = niceMax(Math.max(1, ...data.flatMap((d) => series.map((s) => d[s.key]))));
  const x = (i) => pad.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * max);
  const labelEvery = Math.ceil(data.length / 7);

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  return (
    <div className="relative">
      {series.length > 1 && (
        <div className="flex gap-4 mb-2">
          {series.map((s, i) => (
            <span key={s.key} className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
              <span className="h-2 w-2 rounded-full" style={{ background: SERIES[i] }} />{s.label}
            </span>
          ))}
        </div>
      )}
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={series.map((s) => s.label).join(' and ')}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="#EFEBE5" />
            <text x={pad.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="#A8A29E">{fmtAxis(t, money)}</text>
          </g>
        ))}
        {data.map((d, i) => (i % labelEvery === 0 || i === data.length - 1) && (
          <text key={i} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10.5" fill="#A8A29E">{d.label}</text>
        ))}
        {series.map((s, si) => {
          const pts = data.map((d, i) => `${x(i)},${y(d[s.key])}`).join(' ');
          return (
            <g key={s.key}>
              {si === 0 && <polygon points={`${x(0)},${y(0)} ${pts} ${x(data.length - 1)},${y(0)}`} fill={SERIES[0]} opacity="0.08" />}
              <polyline points={pts} fill="none" stroke={SERIES[si]} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          );
        })}
        {hover != null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={H - pad.b} stroke="#D6D3D1" strokeDasharray="3 3" />
            {series.map((s, si) => <circle key={s.key} cx={x(hover)} cy={y(data[hover][s.key])} r="4.5" fill={SERIES[si]} stroke="#fff" strokeWidth="2" />)}
          </g>
        )}
      </svg>
      {hover != null && (
        <div className="absolute pointer-events-none bg-white border border-line rounded-xl shadow-lift px-3 py-2 text-[12px] -translate-x-1/2"
          style={{ left: `${(x(hover) / W) * 100}%`, top: series.length > 1 ? 28 : 0 }}>
          <p className="font-semibold text-ink mb-0.5">{data[hover].label}</p>
          {series.map((s, si) => (
            <p key={s.key} className="flex items-center gap-1.5 text-ink-soft whitespace-nowrap">
              <span className="h-2 w-2 rounded-full" style={{ background: SERIES[si] }} />{s.label}: <span className="font-semibold text-ink">{money ? `₱${Math.round(data[hover][s.key]).toLocaleString()}` : Math.round(data[hover][s.key]).toLocaleString()}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// Horizontal funnel: each step as a share of the first.
export function Funnel({ steps }) {
  const top = Math.max(1, steps[0]?.value || 1);
  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const w = Math.max(2, (s.value / top) * 100);
        const rate = i > 0 && steps[i - 1].value ? (s.value / steps[i - 1].value) * 100 : null;
        return (
          <div key={s.label} title={`${s.label}: ${s.value.toLocaleString()}`}>
            <div className="flex justify-between text-[12.5px] mb-1">
              <span className="text-ink-soft">{s.label}</span>
              <span className="text-ink font-semibold">{s.value.toLocaleString()}{rate != null && <span className="text-ink-muted font-normal"> · {rate < 1 ? rate.toFixed(2) : rate.toFixed(1)}% of previous</span>}</span>
            </div>
            <div className="h-2.5 rounded-full bg-[#F3EFE9] overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${w}%`, background: SERIES[0] }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function Progress({ value, className = '' }) {
  return (
    <div className={`h-2 rounded-full bg-[#F3EFE9] overflow-hidden ${className}`}>
      <div className="h-full rounded-full bg-brand" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
