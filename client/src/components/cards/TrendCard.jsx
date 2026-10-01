import { Link } from 'react-router-dom';
import Img from '../ui/Img.jsx';
import Icon from '../ui/Icon.jsx';
import { STATUS_LABEL, pad } from '../../lib/format.js';
import { trackEvent } from '../../lib/track.js';

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
        <StatusMark status={trend.trend_status} />
        <span className="mt-0.5 block truncate text-[1.02rem] font-medium">{trend.title}</span>
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
        <StatusMark status={trend.trend_status} />
        <p className="mt-0.5 text-[0.92rem] leading-snug font-medium">{trend.title}</p>
      </div>
    </Link>
  );
}

/** Image tile — used on the trending index and seasonal pages. */
export default function TrendCard({ trend }) {
  return (
    <Link to={trend.page_url || trend.href} onClick={onClick(trend)} className="group block">
      <Img src={trend.image_url} alt={trend.title} aspect={3 / 4} width={600} sizes="(min-width: 1024px) 22vw, 45vw" imgClassName="group-hover:scale-[1.04]" />
      <div className="mt-3">
        <StatusMark status={trend.trend_status} />
        <h3 className="mt-1 font-serif text-[1.45rem] leading-[1.05]">{trend.title}</h3>
        {trend.keyword && <p className="mt-1 font-mono text-[0.72rem] text-muted">“{trend.keyword}”</p>}
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
