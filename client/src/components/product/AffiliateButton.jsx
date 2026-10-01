// The only component that renders outbound affiliate links.
// href is the real retailer URL (transparent to users); the click is logged
// with a beacon so tracking never delays or breaks navigation.
import Icon from '../ui/Icon.jsx';
import { useSite } from '../../context/SiteContext.jsx';
import { useTrackingScope } from '../../context/TrackingContext.jsx';
import { trackAffiliateClick } from '../../lib/track.js';

export function ctaLabel(product, settings, kind = 'primary') {
  const retailer = product?.outbound?.retailer;
  if (retailer && retailer !== 'Amazon') return kind === 'primary' ? `View at ${retailer}` : 'Check current price';
  return kind === 'primary' ? settings?.affiliate?.cta_primary || 'See it on Amazon' : settings?.affiliate?.cta_secondary || 'Check current price';
}

const STYLES = {
  solid: 'inline-flex h-11 items-center justify-center gap-2 rounded-sm bg-ink px-5 text-[0.9rem] font-medium text-paper transition-colors hover:bg-accent',
  accent: 'inline-flex h-12 items-center justify-center gap-2 rounded-sm bg-accent px-6 text-[0.92rem] font-medium text-white transition-colors hover:bg-accent-ink',
  outline: 'inline-flex h-10 items-center justify-center gap-2 rounded-sm border border-ink px-4 text-[0.85rem] font-medium transition-colors hover:bg-ink hover:text-paper',
  link: 'group/cta inline-flex items-center gap-1.5 text-[0.85rem] font-medium text-ink',
  compact: 'inline-flex h-8 items-center gap-1.5 rounded-xs bg-ink px-3 text-[0.78rem] font-medium text-paper transition-colors hover:bg-accent',
};

export default function AffiliateButton({ product, cta = 'card', variant = 'link', kind = 'primary', label, className = '', full = false }) {
  const site = useSite();
  const scope = useTrackingScope();
  const url = product?.outbound?.url;
  const text = label || ctaLabel(product, site, kind);

  if (!url) {
    return (
      <span className={`inline-flex items-center gap-1.5 text-[0.8rem] text-faint ${className}`} title="We don't have a working retailer link for this item right now">
        Link unavailable
      </span>
    );
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="sponsored nofollow noopener"
      onClick={() => trackAffiliateClick(product, { guideId: scope.guideId, categoryId: scope.categoryId, cta })}
      // relative: keeps the visually-hidden label below inside this link, so it
      // can't escape scroll containers and widen the page.
      className={`relative ${STYLES[variant]} ${full ? 'w-full' : ''} ${className}`}
    >
      {variant === 'link' ? <span className="link-underline">{text}</span> : text}
      <Icon name="arrowUpRight" size={variant === 'link' ? 15 : 16} className="transition-transform duration-300 group-hover/cta:-translate-y-0.5 group-hover/cta:translate-x-0.5" />
      <span className="sr-only">(opens retailer site in a new tab)</span>
    </a>
  );
}
