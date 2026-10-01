// Lightweight SVG charts for the admin. One series, one hue (validated
// persimmon on the card surface), recessive grid, hover tooltips, and a
// visually-hidden table so the numbers are never chart-only.
import { useMemo, useRef, useState } from 'react';

const ACCENT = 'var(--color-accent)';

function niceMax(v) {
  if (v <= 4) return 4;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

const shortDate = (d) => new Date(`${d}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

/** Single-series area/line over time. data: [{ date: 'YYYY-MM-DD', clicks }] */
export function TimeChart({ data = [], valueKey = 'clicks', label = 'Clicks', height = 220 }) {
  const ref = useRef(null);
  const [hover, setHover] = useState(null);
  const W = 720;
  const H = height;
  const pad = { t: 12, r: 12, b: 26, l: 34 };
  const max = niceMax(Math.max(...data.map((d) => d[valueKey]), 0));
  const x = (i) => pad.l + (data.length <= 1 ? 0 : (i / (data.length - 1)) * (W - pad.l - pad.r));
  const y = (v) => pad.t + (1 - v / max) * (H - pad.t - pad.b);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[valueKey]).toFixed(1)}`).join('');
  const area = data.length ? `${line}L${x(data.length - 1)},${y(0)}L${x(0)},${y(0)}Z` : '';
  const ticks = [0, max / 2, max];
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  const onMove = (e) => {
    const rect = ref.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  if (!data.length) return <p className="py-10 text-center text-sm text-muted">No data for this range yet.</p>;
  const h = hover != null ? data[hover] : null;

  return (
    <div className="relative">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none" role="img" aria-label={`${label} over time`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)} onTouchMove={(e) => onMove(e.touches[0])} onTouchEnd={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
            <text x={pad.l - 8} y={y(t) + 3.5} textAnchor="end" className="fill-muted font-mono text-[10px]">{Math.round(t)}</text>
          </g>
        ))}
        {data.map((d, i) => (i % labelEvery === 0 || i === data.length - 1) && (
          <text key={d.date} x={x(i)} y={H - 6} textAnchor={i === 0 ? 'start' : i === data.length - 1 ? 'end' : 'middle'} className="fill-muted font-mono text-[10px]">{shortDate(d.date)}</text>
        ))}
        <path d={area} fill={ACCENT} opacity="0.1" />
        <path d={line} fill="none" stroke={ACCENT} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={y(0)} stroke="var(--color-ink)" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
            <circle cx={x(hover)} cy={y(h[valueKey])} r="5" fill={ACCENT} stroke="var(--color-card)" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-0 rounded-xs bg-ink px-2.5 py-1.5 text-[0.75rem] text-paper shadow-pop"
          style={{ left: `${(x(hover) / W) * 100}%`, transform: `translateX(${hover > data.length / 2 ? '-110%' : '10%'})` }}>
          <span className="block font-mono text-paper/60">{shortDate(h.date)}</span>
          <span className="font-medium">{h[valueKey].toLocaleString()} {label.toLowerCase()}</span>
        </div>
      )}
      <table className="sr-only">
        <caption>{label} by day</caption>
        <tbody>{data.map((d) => <tr key={d.date}><th scope="row">{d.date}</th><td>{d[valueKey]}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

/** Ranked horizontal bars. Labels and values in text ink; the bar carries magnitude only. */
export function BarList({ rows = [], labelKey = 'name', valueKey = 'clicks', empty = 'No clicks yet in this range.', href }) {
  const max = useMemo(() => Math.max(...rows.map((r) => r[valueKey]), 1), [rows, valueKey]);
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">{empty}</p>;
  return (
    <ol className="space-y-2.5">
      {rows.map((r, i) => {
        const label = r[labelKey] ?? '—';
        const link = href?.(r);
        return (
          <li key={`${label}-${i}`} className="group" title={`${label}: ${r[valueKey].toLocaleString()}`}>
            <div className="flex items-baseline justify-between gap-3 text-[0.82rem]">
              {link ? <a href={link} target="_blank" rel="noreferrer" className="truncate hover:underline">{label}</a> : <span className="truncate">{label}</span>}
              <span className="shrink-0 font-mono text-ink-2">{r[valueKey].toLocaleString()}</span>
            </div>
            <div className="mt-1 h-2 rounded-r-[4px] bg-transparent">
              <div className="h-2 rounded-r-[4px] transition-[width] duration-500 group-hover:opacity-80" style={{ width: `${Math.max((r[valueKey] / max) * 100, 1.5)}%`, background: ACCENT }} />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function StatTile({ label, value, note }) {
  return (
    <div className="rounded-sm border border-line bg-card p-4">
      <p className="font-mono text-[0.66rem] tracking-wider text-muted uppercase">{label}</p>
      <p className="mt-2 font-serif text-[2.4rem] leading-none">{value ?? '—'}</p>
      {note && <p className="mt-1.5 text-[0.75rem] text-muted">{note}</p>}
    </div>
  );
}
