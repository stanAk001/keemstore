import { Link } from 'react-router-dom';
import Img from '../ui/Img.jsx';
import Icon from '../ui/Icon.jsx';
import { STATUS_LABEL, formatDate, pad } from '../../lib/format.js';
import { trackEvent } from '../../lib/track.js';

/** "Oct 2026" — when a trend's growth figure was read (a plain YYYY-MM-DD date, so no time-zone shift). */
export function trendMonth(t) {
  const m = String(t?.measured_at || '').match(/^(\d{4})-(\d{2})/);
  return m ? formatDate(new Date(Number(m[1]), Number(m[2]) - 1, 15), { month: 'short', year: 'numeric' }) : '';
}

/** The growth figure as Pinterest shows it, e.g. "↑243% MoM". */
export function GrowthMark({ trend, className = '' }) {
  if (!trend.growth) return null;
  const short = /month over month/.test(trend.growth_note || '') ? 'MoM' : '';
  return (
    <span className={`font-mono text-[0.7rem] font-medium tracking-wide text-good ${className}`}>
      {trend.growth}{short && ` ${short}`}
    </span>
  );
}

const STATUS_TONE = {
  trending: 'text-accent-ink',
  rising: 'text-accent-ink',
  approaching: 'text-ink-2',
  seasonal: 'text-good',
  evergreen: 'text-muted',
};

function StatusMark({ status }) {
  return (
    <span className={`eyebrow inline-flex items-center gap-1 text-[0.6rem] ${STATUS_TONE[status] || ''}`}>
      {(status === 'trending' || status === 'rising') && <Icon name="trend" size={12} strokeWidth={2} />}
      {STATUS_LABEL[status] || status}
    </span>
  );
}

const onClick = (t) => () => trackEvent('trend_click', { entity_type: 'trend', entity_id: t.id });

/** Numbered row — used in the homepage trending list. */
export function TrendRow({ trend, index }) {
  return (
    <Link to={trend.href} onClick={onClick(trend)} className="group grid grid-cols-[2.2rem_56px_1fr_auto] items-center gap-4 border-t border-line py-3.5">
      <span className="font-serif text-[1.6rem] leading-none text-faint transition-colors group-hover:text-accent">{pad(index)}</span>
      <Img src={trend.image_url} alt="" aspect={1} width={140} sizes="56px" className="rounded-full" />
      <span className="min-w-0">
        <span className="block truncate text-[1.02rem] font-medium">{trend.title}</span>
        {trend.growth ? (
          <span className="mt-0.5 flex items-center gap-1.5 truncate text-[0.78rem] text-muted">
            <GrowthMark trend={trend} />
            {trend.edit && <><span aria-hidden>·</span><span className="truncate">{trend.edit}</span></>}
          </span>
        ) : (
          <StatusMark status={trend.trend_status} />
        )}
      </span>
      <Icon name="arrow" size={16} className="text-faint transition-all duration-300 group-hover:translate-x-1 group-hover:text-ink" />
    </Link>
  );
}

/** Compact ranked tile — the trending list on phones (two per row). */
export function TrendTile({ trend, index }) {
  return (
    <Link to={trend.href} onClick={onClick(trend)} className="group block">
      <div className="relative">
        <Img src={trend.image_url} alt="" aspect={4 / 3} width={400} sizes="45vw" className="rounded-sm" imgClassName="group-active:scale-[1.03]" />
        <span className="absolute top-2 left-2 rounded-xs bg-paper/90 px-1.5 py-0.5 font-mono text-[0.66rem] text-ink backdrop-blur-sm">{pad(index)}</span>
      </div>
      <div className="mt-2">
        {trend.growth ? <GrowthMark trend={trend} /> : <StatusMark status={trend.trend_status} />}
        <p className="mt-0.5 text-[0.92rem] leading-snug font-medium">{trend.title}</p>
      </div>
    </Link>
  );
}

/** Image tile — used on the trending index and seasonal pages. */
export default function TrendCard({ trend }) {
  return (
    <Link to={trend.page_url || trend.href} onClick={onClick(trend)} className="group block">
      <div className="relative">
        <Img src={trend.image_url} alt={trend.title} aspect={3 / 4} width={600} sizes="(min-width: 1024px) 22vw, 45vw" imgClassName="group-hover:scale-[1.04]" />
        {trend.growth && (
          <span className="absolute top-2.5 left-2.5 rounded-xs bg-paper/90 px-2 py-1 backdrop-blur-sm">
            <GrowthMark trend={trend} />
          </span>
        )}
      </div>
      <div className="mt-3">
        {trend.growth ? <p className="eyebrow text-[0.6rem]">Trending on Pinterest</p> : <StatusMark status={trend.trend_status} />}
        <h3 className="mt-1 font-serif text-[1.45rem] leading-[1.05]">{trend.title}</h3>
        {trend.keyword && <p className="mt-1 line-clamp-1 font-mono text-[0.72rem] text-muted">“{trend.keyword}”</p>}
      </div>
    </Link>
  );
}

/** Compact pill for "Related searches" style lists. */
export function TrendPill({ trend }) {
  return (
    <Link
      to={trend.href}
      onClick={onClick(trend)}
      className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-card py-1.5 pr-3.5 pl-1.5 text-[0.88rem] transition-colors hover:border-ink"
    >
      <Img src={trend.image_url} alt="" aspect={1} width={80} sizes="28px" className="w-7 rounded-full" />
      {trend.title}
    </Link>
  );
}
