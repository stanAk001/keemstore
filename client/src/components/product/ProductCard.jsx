import { Link } from 'react-router-dom';
import Img from '../ui/Img.jsx';
import Badge, { DemoBadge, PlacementBadge } from '../ui/Badge.jsx';
import AffiliateButton from './AffiliateButton.jsx';
import PriceTag from './PriceTag.jsx';
import { trackEvent } from '../../lib/track.js';

/**
 * Standard discovery card. `label` is an editorial tag like "Best for mornings".
 * size="sm" is used in rails and dense grids.
 * Gift pages pass `eyebrow` (who it's for) and `note` (a full gift line,
 * e.g. "For the friend who…") in place of the category and best-for line.
 */
export default function ProductCard({ product, label, eyebrow, note, cta = 'card', size = 'md', sizes = '(min-width: 1024px) 25vw, 50vw', priority = false }) {
  const href = `/products/${product.slug}`;
  const onOpen = () => trackEvent('product_click', { entity_type: 'product', entity_id: product.id });
  const kicker = eyebrow || product.brand || product.subcategory_name || product.category_name;
  const line = note || (product.best_for && `For ${product.best_for.charAt(0).toLowerCase() + product.best_for.slice(1)}`);

  return (
    <article className="group flex h-full flex-col">
      <Link to={href} onClick={onOpen} className="relative block overflow-hidden" aria-label={product.name}>
        <Img
          src={product.image?.url}
          alt={product.image?.alt || product.name}
          aspect={4 / 5}
          sizes={sizes}
          width={640}
          priority={priority}
          imgClassName="group-hover:scale-[1.035]"
        />
        <div className="absolute inset-x-2.5 top-2.5 flex items-start justify-between gap-2">
          <div className="flex flex-wrap gap-1">
            {label && <Badge tone="paper">{label}</Badge>}
            <PlacementBadge placement={product.placement} />
          </div>
          <DemoBadge show={product.is_demo} />
        </div>
      </Link>

      <div className="flex flex-1 flex-col pt-3 sm:pt-4">
        {kicker && <p className="eyebrow mb-1.5 text-[0.62rem]">{kicker}</p>}
        <h3 className={`font-medium leading-snug tracking-[-0.01em] ${size === 'sm' ? 'text-[0.88rem] sm:text-[0.92rem]' : 'text-[0.94rem] sm:text-[1rem]'}`}>
          <Link to={href} onClick={onOpen} className="link-underline">
            {product.name}
          </Link>
        </h3>
        {line && size !== 'sm' && (
          <p className="mt-1.5 line-clamp-2 font-serif text-[0.98rem] leading-snug text-muted italic sm:mt-2 sm:text-[1.08rem]">{line}</p>
        )}
        <div className="mt-auto pt-3 sm:pt-4">
          <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
            <PriceTag product={product} />
            <AffiliateButton product={product} cta={cta} variant="link" label={size === 'sm' ? 'View' : undefined} className="ml-auto" />
          </div>
        </div>
      </div>
    </article>
  );
}
