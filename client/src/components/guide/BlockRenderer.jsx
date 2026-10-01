// Renders structured editor blocks. No HTML strings are ever injected.
import Img from '../ui/Img.jsx';
import { Inline, stripInline } from '../../lib/inline.jsx';
import { slugify, safeHref } from '../../lib/format.js';
import ProsCons from '../product/ProsCons.jsx';
import AffiliateButton from '../product/AffiliateButton.jsx';
import PriceTag from '../product/PriceTag.jsx';
import { ProductComparison } from '../product/GuidePicks.jsx';
import FAQ from './FAQ.jsx';

export const headingId = (text) => slugify(stripInline(text || '')).slice(0, 60);

const CALLOUT = {
  info: 'border-ink bg-paper-2',
  tip: 'border-good bg-good-soft/60',
  warning: 'border-accent bg-accent-soft/60',
};

function Block({ block: b, products = {} }) {
  switch (b.type) {
    case 'heading': {
      const H = b.level === 3 ? 'h3' : 'h2';
      return (
        <H id={headingId(b.text)} className={`scroll-mt-28 font-serif ${H === 'h2' ? 'mt-14 text-[2.1rem] leading-[1.08]' : 'mt-10 text-[1.6rem] leading-tight'}`}>
          <Inline text={b.text} />
        </H>
      );
    }
    case 'paragraph':
      return <p className="mt-5"><Inline text={b.text} /></p>;
    case 'list': {
      const L = b.style === 'number' ? 'ol' : 'ul';
      return (
        <L className={`mt-5 space-y-2 pl-6 ${L === 'ol' ? 'list-decimal marker:font-mono marker:text-sm marker:text-muted' : 'list-disc marker:text-accent'}`}>
          {(b.items || []).map((it, i) => <li key={i} className="pl-1"><Inline text={it} /></li>)}
        </L>
      );
    }
    case 'image':
      if (!safeHref(b.url)) return null;
      return (
        <figure className="my-10 -mx-4 sm:mx-0">
          <Img src={b.url} alt={b.alt || ''} aspect={b.aspect || 3 / 2} width={1400} sizes="(min-width: 768px) 720px, 100vw" />
          {(b.caption || b.credit) && (
            <figcaption className="mt-2.5 px-4 text-[0.82rem] text-muted sm:px-0">
              {b.caption} {b.credit && <span className="text-faint">{b.credit}</span>}
            </figcaption>
          )}
        </figure>
      );
    case 'quote':
      return (
        <blockquote className="my-10 border-l-2 border-accent pl-6">
          <p className="font-serif text-[1.75rem] leading-snug text-ink italic"><Inline text={b.text} /></p>
          {b.cite && <cite className="eyebrow mt-3 block not-italic">{b.cite}</cite>}
        </blockquote>
      );
    case 'table':
      return (
        <div className="my-8 -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full min-w-[480px] border-collapse text-[0.93rem]">
            {b.headers?.length > 0 && (
              <thead>
                <tr>{b.headers.map((h, i) => <th key={i} scope="col" className="border-b border-ink py-2.5 pr-4 text-left eyebrow text-ink">{h}</th>)}</tr>
              </thead>
            )}
            <tbody>
              {(b.rows || []).map((row, r) => (
                <tr key={r} className="border-b border-line">
                  {row.map((cell, c) => <td key={c} className="py-3 pr-4 align-top"><Inline text={cell} /></td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'callout':
      return (
        <aside className={`my-8 border-l-2 p-5 ${CALLOUT[b.tone] || CALLOUT.info}`}>
          {b.title && <p className="mb-1.5 font-semibold text-ink">{b.title}</p>}
          <p className="text-[0.98rem] leading-relaxed"><Inline text={b.text} /></p>
        </aside>
      );
    case 'editor_note':
      return (
        <aside className="my-8 bg-card p-5 ring-1 ring-line">
          <p className="eyebrow mb-2 text-ink">Editor’s note</p>
          <p className="font-serif text-[1.25rem] leading-snug italic"><Inline text={b.text} /></p>
        </aside>
      );
    case 'verdict':
      return (
        <aside className="my-10 bg-ink p-6 text-paper">
          <p className="eyebrow text-paper/60">{b.title || 'The verdict'}</p>
          <p className="mt-2 font-serif text-[1.5rem] leading-snug"><Inline text={b.text} /></p>
          {products[b.productId] && (
            <div className="mt-5">
              <AffiliateButton product={products[b.productId]} cta="block_verdict" variant="compact" className="!bg-paper !text-ink hover:!bg-accent hover:!text-white" />
            </div>
          )}
        </aside>
      );
    case 'proscons':
      return (
        <div className="my-8 border-y border-line py-6">
          <ProsCons pros={b.pros || []} cons={b.cons || []} />
        </div>
      );
    case 'faq':
      return <div className="my-8"><FAQ items={b.items || []} /></div>;
    case 'product': {
      const p = products[b.productId];
      if (!p) return null;
      return (
        <div className="my-10 grid grid-cols-[110px_1fr] gap-5 border-y border-line py-5 sm:grid-cols-[150px_1fr]">
          <Img src={p.image?.url} alt={p.name} aspect={4 / 5} width={320} sizes="150px" />
          <div className="flex flex-col">
            {b.label && <p className="eyebrow text-accent-ink">{b.label}</p>}
            <p className="mt-1 font-serif text-[1.45rem] leading-tight">{p.name}</p>
            <p className="mt-2 text-[0.93rem] leading-snug text-muted">{b.note || p.short_description}</p>
            <div className="mt-auto flex flex-wrap items-center gap-4 pt-4">
              <AffiliateButton product={p} cta="block_product" variant="solid" />
              <PriceTag product={p} />
            </div>
          </div>
        </div>
      );
    }
    case 'comparison': {
      const picks = (b.productIds || []).map((id) => ({ product_id: id }));
      return <div className="my-10 not-prose"><ProductComparison picks={picks} products={products} /></div>;
    }
    case 'cta': {
      const p = products[b.productId];
      const href = safeHref(b.url);
      return (
        <div className="my-10 flex flex-col items-start gap-4 border border-ink p-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-serif text-[1.35rem] leading-snug"><Inline text={b.text} /></p>
          {p ? (
            <AffiliateButton product={p} cta="block_cta" variant="accent" label={b.label || undefined} />
          ) : href ? (
            <a href={href} className="inline-flex h-11 items-center rounded-sm bg-ink px-5 text-sm font-medium text-paper hover:bg-accent">{b.label || 'Learn more'}</a>
          ) : null}
        </div>
      );
    }
    case 'divider':
      return <hr className="my-12 border-line" />;
    default:
      return null;
  }
}

export default function BlockRenderer({ blocks = [], products }) {
  return blocks.map((b, i) => <Block key={b.id || i} block={b} products={products} />);
}
