// Product treatments inside a guide. The top pick gets a distinctly stronger
// layout; later picks alternate image side so the list doesn't read as a grid.
import { Link } from 'react-router-dom';
import Img from '../ui/Img.jsx';
import Badge, { DemoBadge, PlacementBadge } from '../ui/Badge.jsx';
import AffiliateButton from './AffiliateButton.jsx';
import PriceTag from './PriceTag.jsx';
import ProsCons, { FitNotes } from './ProsCons.jsx';
import { pad } from '../../lib/format.js';

export const pickAnchor = (product) => `pick-${product.slug}`;

export function FeaturedProductCard({ product, label, note, index = 1 }) {
  return (
    <article id={pickAnchor(product)} className="scroll-mt-28 border-t-[3px] border-accent bg-card">
      <div className="grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Wide and short on phones so the name and button are visible sooner. */}
        <div className="relative aspect-[4/3] md:aspect-square">
          <Img src={product.image?.url} alt={product.image?.alt || product.name} sizes="(min-width: 768px) 40vw, 100vw" width={900} />
          <div className="absolute top-3 right-3"><DemoBadge show={product.is_demo} /></div>
        </div>
        <div className="flex flex-col p-5 md:p-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="accent">Our top pick</Badge>
            {label && <Badge tone="neutral">{label}</Badge>}
            <PlacementBadge placement={product.placement} />
          </div>
          <p className="eyebrow mt-4 md:mt-5">No. {pad(index)}</p>
          <h3 className="mt-1 font-serif text-title">{product.name}</h3>
          {product.short_description && <p className="mt-3 text-[1rem] leading-relaxed text-ink-2">{product.short_description}</p>}
          {(note || product.editor_note) && (
            <div className="mt-5 border-l-2 border-ink pl-4">
              <p className="eyebrow mb-1 text-ink">Why we like it</p>
              <p className="font-serif text-[1.2rem] leading-snug italic">{note || product.editor_note}</p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-line pt-5 md:mt-6">
            <AffiliateButton product={product} cta="guide_top_pick" variant="accent" className="w-full sm:w-auto" />
            <div className="flex flex-col">
              <PriceTag product={product} className="text-base" />
              <AffiliateButton product={product} cta="guide_top_pick_price" kind="secondary" variant="link" className="!text-[0.78rem] text-muted" />
            </div>
          </div>
        </div>
      </div>
      <div className="grid gap-5 border-t border-line p-5 md:gap-6 md:p-8">
        <FitNotes bestFor={product.best_for} notFor={product.not_for} />
        <ProsCons pros={product.pros} cons={product.cons} />
      </div>
    </article>
  );
}

export function PickCard({ product, label, note, index, flip = false }) {
  return (
    <article id={pickAnchor(product)} className="scroll-mt-28 border-t border-ink pt-5 md:pt-6">
      {/*
        Three parts: photo, heading, details.
        Phones: small photo beside the heading; details full width below.
        md+: photo in its own column spanning both rows. Flipped cards swap sides
        and column widths so the text always gets the wider column.
      */}
      <div className={`grid grid-cols-[112px_minmax(0,1fr)] items-start gap-x-4 gap-y-5 md:gap-x-10 md:gap-y-0 ${flip ? 'md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]' : 'md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]'}`}>
        <Link to={`/products/${product.slug}`} className={`group relative block md:row-span-2 ${flip ? 'md:col-start-2 md:row-start-1' : ''}`}>
          <Img src={product.image?.url} alt={product.image?.alt || product.name} aspect={4 / 5} sizes="(min-width: 768px) 30vw, 112px" width={700} imgClassName="group-hover:scale-[1.03]" />
          <div className="absolute top-2 right-2 hidden md:block"><DemoBadge show={product.is_demo} /></div>
        </Link>
        <div className={`min-w-0 ${flip ? 'md:col-start-1 md:row-start-1' : ''}`}>
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 md:gap-4">
            <span className="font-serif text-[2.2rem] leading-none text-accent md:text-5xl">{pad(index)}</span>
            {label && <span className="eyebrow text-[0.62rem] text-ink md:text-[0.7rem]">{label}</span>}
            <PlacementBadge placement={product.placement} />
          </div>
          <h3 className="mt-2 font-serif text-[1.35rem] leading-[1.08] md:mt-4 md:text-[1.9rem] md:leading-[1.05]">{product.name}</h3>
          {product.short_description && <p className="mt-2 hidden leading-relaxed text-ink-2 md:mt-3 md:block">{product.short_description}</p>}
        </div>
        <div className={`col-span-2 min-w-0 md:col-span-1 md:row-start-2 ${flip ? 'md:col-start-1' : 'md:col-start-2'}`}>
          {product.short_description && <p className="leading-relaxed text-ink-2 md:hidden">{product.short_description}</p>}
          {(note || product.editor_note) && (
            <p className="mt-3 font-serif text-[1.08rem] leading-snug text-ink italic md:mt-4 md:text-[1.15rem]">“{note || product.editor_note}”</p>
          )}
          <div className="mt-4 md:mt-5">
            <FitNotes bestFor={product.best_for} notFor={product.not_for} />
          </div>
          <div className="mt-4 md:mt-5">
            <ProsCons pros={product.pros} cons={product.cons} compact />
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4 md:mt-6 md:gap-5">
            <AffiliateButton product={product} cta="guide_pick" variant="solid" className="w-full sm:w-auto" />
            <PriceTag product={product} />
          </div>
        </div>
      </div>
    </article>
  );
}

/** Summary box at the top of a guide: label → product → price → CTA. */
export function QuickVerdict({ picks, products, answer }) {
  if (!picks.length && !answer) return null;
  return (
    <aside className="bg-ink p-6 text-paper md:p-8" aria-labelledby="quick-answer">
      <p id="quick-answer" className="eyebrow text-paper/60">Quick answer</p>
      {answer && <p className="mt-3 font-serif text-[1.45rem] leading-snug md:text-[1.6rem]">{answer}</p>}
      {picks.length > 0 && (
        <ol className="mt-6 divide-y divide-paper/15 border-y border-paper/15">
          {picks.map((pick, i) => {
            const product = products[pick.product_id];
            return (
              <li key={pick.product_id} className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 py-3">
                <span className="font-mono text-sm text-paper/50">{pad(i + 1)}</span>
                <a href={`#${pickAnchor(product)}`} className="min-w-0">
                  {pick.label && <span className="eyebrow block text-[0.6rem] text-accent-soft">{pick.label}</span>}
                  <span className="block truncate text-[0.95rem] font-medium hover:underline">{product.name}</span>
                </a>
                <AffiliateButton product={product} cta="quick_verdict" variant="compact" label="View" className="!bg-paper !text-ink hover:!bg-accent hover:!text-white" />
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}

/** Side-by-side comparison of a guide's picks. Scrolls horizontally on small screens. */
export function ProductComparison({ picks, products }) {
  const items = picks.map((p) => ({ ...p, product: products[p.product_id] })).filter((p) => p.product);
  if (items.length < 2) return null;
  const rows = [
    ['Best for', (p) => p.product.best_for],
    ['Skip if', (p) => p.product.not_for],
    ['Price', (p) => <PriceTag product={p.product} />],
  ].filter(([name]) => name !== 'Price' || items.some((it) => it.product.price_display || it.product.current_price != null));
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[560px] border-collapse text-left text-[0.9rem]">
        <caption className="sr-only">Comparison of recommended products</caption>
        <thead>
          <tr>
            <th scope="col" className="sticky left-0 z-10 w-24 bg-paper" />
            {items.map((it, i) => (
              <th key={it.product_id} scope="col" className="min-w-[130px] border-b border-ink px-3 pb-4 align-top font-normal">
                <a href={`#${pickAnchor(it.product)}`} className="group block">
                  <Img src={it.product.image?.url} alt="" aspect={1} width={300} sizes="180px" className="mb-3 w-20" />
                  <span className="font-mono text-[0.7rem] text-muted">{pad(i + 1)}</span>
                  <span className="block font-medium leading-snug group-hover:underline">{it.product.name}</span>
                  {it.label && <span className="eyebrow mt-1 block text-[0.6rem] text-accent-ink">{it.label}</span>}
                </a>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(([name, get]) => (
            <tr key={name} className="border-b border-line">
              <th scope="row" className="eyebrow sticky left-0 z-10 bg-paper py-4 pr-3 align-top whitespace-nowrap text-ink">{name}</th>
              {items.map((it) => (
                <td key={it.product_id} className="px-3 py-4 align-top leading-snug text-ink-2">{get(it) || '—'}</td>
              ))}
            </tr>
          ))}
          <tr>
            <th scope="row" className="sticky left-0 z-10 bg-paper" />
            {items.map((it) => (
              <td key={it.product_id} className="px-3 py-4">
                <AffiliateButton product={it.product} cta="comparison" variant="outline" label="View" />
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
