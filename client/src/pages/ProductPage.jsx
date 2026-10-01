import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../lib/useFetch.js';
import { usePageView } from '../lib/hooks.js';
import { Seo, breadcrumbLd } from '../lib/seo.jsx';
import { formatDate } from '../lib/format.js';
import { useSite } from '../context/SiteContext.jsx';
import { TrackingScope } from '../context/TrackingContext.jsx';
import Img from '../components/ui/Img.jsx';
import Badge, { PlacementBadge } from '../components/ui/Badge.jsx';
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx';
import AffiliateButton from '../components/product/AffiliateButton.jsx';
import PriceTag from '../components/product/PriceTag.jsx';
import ProsCons, { FitNotes } from '../components/product/ProsCons.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { ErrorState, PageSkeleton } from '../components/ui/States.jsx';
import NotFound from './NotFound.jsx';

export default function ProductPage() {
  const { slug } = useParams();
  const site = useSite();
  const { data: p, error, loading, reload } = useFetch(`/products/${slug}`);
  const [imgIndex, setImgIndex] = useState(0);
  // The sticky mobile bar appears only once the main buy button has scrolled away.
  const buyRef = useRef(null);
  const [showSticky, setShowSticky] = useState(false);
  useEffect(() => {
    const el = buyRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    // The root extends far below the screen, so the button only "leaves" by
    // passing above the top — even on a fast jump that skips over the viewport.
    const io = new IntersectionObserver(([e]) => setShowSticky(!e.isIntersecting), { rootMargin: '0px 0px 100000px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [p?.id]);
  usePageView({ entityType: 'product', entityId: p?.id, ready: Boolean(p) });

  if (loading && !p) return <PageSkeleton />;
  if (error?.response?.status === 404) return <NotFound />;
  if (error) return <div className="container-x py-20"><ErrorState error={error} onRetry={reload} /></div>;
  if (!p) return null;

  const siteUrl = site?.site?.url || window.location.origin;
  const crumbs = [
    { label: 'Home', to: '/' },
    ...(p.category_name && p.category_path ? [{ label: p.subcategory_name || p.category_name, to: p.category_path }] : []),
    { label: p.name, to: `/products/${p.slug}` },
  ];
  const images = p.images.length ? p.images : [{ url: null, alt: p.name }];
  const current = images[Math.min(imgIndex, images.length - 1)];
  // Product markup with only the facts we hold — no invented offers or ratings.
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.short_description || p.description,
    image: p.images.map((i) => i.url),
    ...(p.brand ? { brand: { '@type': 'Brand', name: p.brand } } : {}),
    ...(p.asin ? { sku: p.asin } : {}),
  };

  return (
    <TrackingScope categoryId={p.subcategory_id || p.category_id}>
      <Seo title={p.name} description={p.short_description} image={p.image?.url} path={`/products/${p.slug}`} jsonLd={[productLd, breadcrumbLd(crumbs, siteUrl)]} />
      <div className="container-x pt-5 md:pt-12">
        <Breadcrumbs items={crumbs} />
        <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-6">
            <div className="lg:sticky lg:top-28">
              <div className="aspect-square lg:aspect-[4/5]"><Img src={current.url} alt={current.alt || p.name} priority width={1100} sizes="(min-width: 1024px) 45vw, 100vw" /></div>
              {current.credit && <p className="mt-2 text-[0.72rem] text-faint">{current.credit}</p>}
              {images.length > 1 && (
                <div className="mt-3 flex gap-2">
                  {images.map((im, i) => (
                    <button key={i} onClick={() => setImgIndex(i)} aria-label={`Show image ${i + 1}`} className={`w-16 ring-offset-2 ring-offset-paper ${i === imgIndex ? 'ring-2 ring-ink' : 'opacity-70 hover:opacity-100'}`}>
                      <Img src={im.url} alt="" aspect={1} width={160} sizes="64px" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="flex flex-wrap gap-2">
              {p.is_demo && <Badge tone="neutral" title="Demo listing for development — not a real recommendation">Demo listing</Badge>}
              <PlacementBadge placement={p.placement} />
            </div>
            {p.brand && <p className="eyebrow mt-4">{p.brand}</p>}
            <h1 className="mt-2 font-serif text-[clamp(2.4rem,1.6rem+3vw,4rem)] leading-[0.98] tracking-[-0.015em]">{p.name}</h1>
            {p.short_description && <p className="mt-4 text-[1rem] leading-relaxed text-ink-2 sm:text-[1.15rem]">{p.short_description}</p>}

            <div ref={buyRef} className="mt-6 flex flex-col gap-4 border-y border-line py-5 sm:mt-8 sm:flex-row sm:items-center sm:justify-between sm:py-6">
              <div>
                <PriceTag product={p} className="!text-2xl" />
                {!p.price_display && p.current_price == null && (
                  <p className="max-w-xs text-[0.9rem] leading-snug text-ink-2">
                    Prices {p.outbound?.retailer && p.outbound.retailer !== 'retailer' ? `at ${p.outbound.retailer}` : ''} change often, so we link straight to the listing for today’s price.
                  </p>
                )}
                {(p.price_source || p.price_checked_at) && (
                  <p className="mt-1 text-[0.75rem] text-muted">
                    {p.price_source}{p.price_checked_at ? ` · checked ${formatDate(p.price_checked_at)}` : ''}. Prices change.
                  </p>
                )}
                {p.rating != null && (
                  <p className="mt-1 text-[0.8rem] text-muted">
                    Rated {p.rating}/5{p.review_count ? ` from ${p.review_count.toLocaleString()} reviews` : ''}
                    {p.rating_source ? ` on ${p.rating_source}` : ''}{p.rating_checked_at ? `, as of ${formatDate(p.rating_checked_at)}` : ''}
                  </p>
                )}
              </div>
              <AffiliateButton product={p} cta="product_page" variant="accent" className="w-full sm:w-auto" />
            </div>

            {p.editor_note && (
              <div className="mt-8 border-l-2 border-accent pl-5">
                <p className="eyebrow mb-1.5 text-ink">Editor’s note</p>
                <p className="font-serif text-[1.35rem] leading-snug italic">{p.editor_note}</p>
              </div>
            )}
            <div className="mt-8"><FitNotes bestFor={p.best_for} notFor={p.not_for} /></div>
            <div className="mt-8"><ProsCons pros={p.pros} cons={p.cons} /></div>
            {/* pre-line keeps the store's paragraphs and bullet lines instead of one run-on block. */}
            {p.description && p.description !== p.short_description && <p className="prose-editorial mt-8 whitespace-pre-line">{p.description}</p>}

            {p.guides.length > 0 && (
              <div className="mt-10">
                <p className="eyebrow mb-3">Recommended in</p>
                <ul className="divide-y divide-line border-y border-line">
                  {p.guides.map((g) => (
                    <li key={g.id}>
                      <Link to={`/guides/${g.slug}`} className="flex items-center justify-between gap-4 py-3.5 hover:text-accent-ink">
                        <span className="font-serif text-[1.25rem] leading-tight">{g.title}</span>
                        {g.label && <span className="eyebrow shrink-0 text-[0.6rem]">{g.label}</span>}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <p className="mt-8 text-[0.8rem] leading-relaxed text-muted">
              {site?.affiliate?.disclosure_short} <Link to="/affiliate-disclosure" className="underline underline-offset-2">Learn more</Link>
            </p>
          </div>
        </div>
      </div>

      {p.related.length > 0 && (
        <section className="container-x mt-24">
          <h2 className="mb-8 border-t border-ink pt-4 font-serif text-headline">You might also consider</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-12 md:gap-x-6 lg:grid-cols-4">
            {p.related.map((r) => <ProductCard key={r.id} product={r} cta="product_related" />)}
          </div>
        </section>
      )}

      <div className="h-16 lg:hidden" aria-hidden />
      {/* Sticky mobile CTA: the primary action stays reachable while reading. */}
      <div className={`fixed inset-x-0 bottom-0 z-30 flex items-center justify-between gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur-md transition-transform duration-300 lg:hidden ${showSticky ? 'translate-y-0' : 'translate-y-full'}`} aria-hidden={!showSticky} style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
        <div className="min-w-0">
          <p className="truncate text-[0.85rem] font-medium">{p.name}</p>
          <PriceTag product={p} className="!text-[0.8rem]" />
        </div>
        <AffiliateButton product={p} cta="product_sticky_mobile" variant="solid" className="!h-10 shrink-0" />
      </div>
    </TrackingScope>
  );
}
