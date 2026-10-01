import { price } from '../../lib/format.js';
import { formatDate } from '../../lib/format.js';

/**
 * Price with its provenance on hover — never presented as live. Renders nothing
 * when the API omits prices (the default; see Affiliate settings → Show prices).
 */
export default function PriceTag({ product, className = '', showSource = false }) {
  const p = price(product);
  if (!p) return null;
  const checked = product.price_checked_at ? formatDate(product.price_checked_at, { month: 'short', day: 'numeric', year: 'numeric' }) : null;
  const note = [product.price_source, checked && `checked ${checked}`].filter(Boolean).join(', ');
  return (
    <span className={`font-mono text-[0.85rem] text-ink ${className}`} title={note ? `Price: ${note}. Prices change — check the retailer.` : undefined}>
      {p}
      {showSource && note && <span className="ml-2 text-[0.7rem] text-faint">({note})</span>}
    </span>
  );
}
