const TONES = {
  neutral: 'border-line-strong text-ink-2',
  ink: 'border-ink bg-ink text-paper',
  accent: 'border-accent bg-accent text-white',
  soft: 'border-transparent bg-accent-soft text-accent-ink',
  paper: 'border-transparent bg-paper/90 text-ink backdrop-blur-sm',
  good: 'border-transparent bg-good-soft text-good',
};

export default function Badge({ tone = 'neutral', children, className = '', ...rest }) {
  return (
    <span {...rest} className={`inline-flex items-center gap-1 rounded-xs border px-1.5 py-0.5 font-mono text-[0.64rem] font-medium tracking-[0.08em] uppercase ${TONES[tone]} ${className}`}>
      {children}
    </span>
  );
}

/** Placement disclosure: editorial picks get no badge; paid placements always do. */
export function PlacementBadge({ placement }) {
  if (placement === 'sponsored') return <Badge tone="ink">Sponsored</Badge>;
  if (placement === 'featured') return <Badge tone="neutral">Featured partner</Badge>;
  return null;
}

export function DemoBadge({ show }) {
  if (!show) return null;
  return (
    <Badge tone="paper" className="!text-muted" title="Demo listing for development — not a real recommendation">
      Demo
    </Badge>
  );
}
