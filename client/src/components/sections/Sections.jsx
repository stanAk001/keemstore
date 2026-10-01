// Predefined, CMS-driven sections. Each type has one intentional layout, so
// editors control content and order without being able to break the design.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Img from '../ui/Img.jsx';
import { HeroMedia } from '../motion/index.jsx';
import { RotatingWord, Marquee, useParallax, parallaxStyle } from '../motion/effects.jsx';
import Icon from '../ui/Icon.jsx';
import Reveal from '../ui/Reveal.jsx';
import SectionHeader from '../ui/SectionHeader.jsx';
import { ButtonLink } from '../ui/Button.jsx';
import { DemoBadge } from '../ui/Badge.jsx';
import ProductCard from '../product/ProductCard.jsx';
import AffiliateButton from '../product/AffiliateButton.jsx';
import PriceTag from '../product/PriceTag.jsx';
import GuideCard from '../cards/GuideCard.jsx';
import CategoryCard from '../cards/CategoryCard.jsx';
import { TrendRow, TrendPill, TrendTile } from '../cards/TrendCard.jsx';
import NewsletterForm from '../NewsletterForm.jsx';
import { useSite } from '../../context/SiteContext.jsx';
import { Inline } from '../../lib/inline.jsx';
import { formatDate, pad, safeHref } from '../../lib/format.js';

const Wrap = ({ children, className = '', id }) => (
  <section id={id} className={`py-10 md:py-20 ${className}`}>
    <div className="container-x">{children}</div>
  </section>
);

// ---------------------------------------------------------------------------
function Hero({ config: c, data = {} }) {
  const images = (c.images || []).filter((i) => i.url).slice(0, 5);
  const collage = useRef(null);
  useParallax(collage);
  const DEPTH = [16, -12, 10, -9, 13];
  // "{rotate}" in the headline becomes a word that cycles through rotating_words.
  const words = (Array.isArray(c.rotating_words) ? c.rotating_words : String(c.rotating_words || '').split(',')).map((w) => String(w).trim()).filter(Boolean);
  const [before, rawAfter] = String(c.headline || 'Find things *worth* buying.').split('{rotate}');
  // Punctuation right after {rotate} travels with each word, so short words don't leave a gap before it.
  const punct = rawAfter?.match(/^[.!?,]+/)?.[0] || '';
  const after = rawAfter === undefined ? undefined : rawAfter.slice(punct.length);
  const ticker = (data.trends || []).map((t) => ({ label: t.title, href: t.href }));
  const tiles = [
    'col-span-12 aspect-[4/3] md:col-span-7 md:row-span-4 md:aspect-auto',
    'col-span-6 aspect-square md:col-span-5 md:row-span-3 md:aspect-auto',
    'col-span-6 aspect-square md:col-span-5 md:row-span-3 md:aspect-auto',
    // Explicit placement: auto-flow would push these past the six fixed rows.
    'hidden md:block md:col-span-4 md:col-start-1 md:row-span-2 md:row-start-5',
    'hidden md:block md:col-span-3 md:col-start-5 md:row-span-2 md:row-start-5',
  ];
  return (
    <section className="pt-5 pb-4 md:pt-12 md:pb-20">
      <div className="container-x grid gap-8 lg:grid-cols-12 lg:gap-12">
        <div className="flex flex-col justify-end lg:col-span-5 lg:pb-2">
          {c.eyebrow && (
            <p className="eyebrow flex animate-fade-up items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden />
              {c.eyebrow}
            </p>
          )}
          <h1 className="mt-4 animate-fade-up md:mt-5 font-serif text-display tracking-[-0.025em] [animation-delay:60ms] [&_em]:text-accent [&_em]:italic">
            <Inline text={before} />
            {after !== undefined && (words.length ? <RotatingWord words={words.map((w) => w + punct)} /> : punct)}
            {after !== undefined && <Inline text={after} />}
          </h1>
          {c.subtext && <p className="mt-4 max-w-md animate-fade-up text-[1rem] leading-relaxed md:mt-6 md:text-[1.1rem] text-ink-2 [animation-delay:120ms]">{c.subtext}</p>}
          {/* Phones: two equal buttons side by side. Larger screens: natural widths. */}
          <div className="mt-6 grid animate-fade-up grid-cols-2 gap-2.5 [animation-delay:180ms] sm:mt-8 sm:flex sm:flex-wrap sm:gap-3">
            {c.primary_cta?.url && <ButtonLink to={c.primary_cta.url} size="lg" iconRight="arrow" className="!h-12 !gap-1.5 !px-2 !text-[0.8rem] sm:!h-13 sm:!gap-2.5 sm:!px-7 sm:!text-[0.95rem]">{c.primary_cta.label}</ButtonLink>}
            {c.secondary_cta?.url && <ButtonLink to={c.secondary_cta.url} size="lg" variant="outline" className="!h-12 !px-2 !text-[0.8rem] sm:!h-13 sm:!px-7 sm:!text-[0.95rem]">{c.secondary_cta.label}</ButtonLink>}
          </div>
        </div>
        {images.length > 0 && (
          <div ref={collage} className="grid grid-cols-12 gap-2.5 md:h-[min(68vh,640px)] md:grid-rows-6 lg:col-span-7">
            {images.map((im, i) => {
              const href = safeHref(im.href);
              const tile = (
                <>
                  <div className="absolute inset-0" style={parallaxStyle(DEPTH[i])}>
                    <HeroMedia motion={im.motion} src={im.url} alt={im.alt || ''} priority={i < 2} width={i === 0 ? 1200 : 700} sizes={i === 0 ? '(min-width: 1024px) 34vw, 100vw' : '(min-width: 1024px) 22vw, 50vw'} imgClassName="group-hover:scale-[1.04]" />
                  </div>
                  {im.label && (
                    <span className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 rounded-xs bg-paper/90 px-2 py-1 font-mono text-[0.62rem] tracking-wider uppercase backdrop-blur-sm">
                      {pad(i + 1)} {im.label}
                      {href && <Icon name="arrow" size={11} className="transition-transform group-hover:translate-x-0.5" />}
                    </span>
                  )}
                </>
              );
              const cls = `group relative block animate-fade-up overflow-hidden ${tiles[i]}`;
              const style = { animationDelay: `${120 + i * 70}ms` };
              return href ? (
                <Link key={i} to={href} className={cls} style={style}>{tile}</Link>
              ) : (
                <div key={i} className={cls} style={style}>{tile}</div>
              );
            })}
          </div>
        )}
      </div>
      {ticker.length > 0 && (
        <div className="mt-10 md:mt-16"><Marquee items={ticker} label="Trending now" /></div>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
function Trending({ title, subtitle, data, index }) {
  const half = Math.ceil(data.trends.length / 2);
  return (
    <Wrap>
      <div className="grid gap-6 md:gap-10 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <SectionHeader index={index} eyebrow="Trending now" title={title || 'People are looking for these right now'} subtitle={subtitle} align="stack" link={{ url: '/trending', label: 'All trends' }} />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-5 md:hidden">
          {data.trends.map((t, i) => <TrendTile key={t.id} trend={t} index={i + 1} />)}
        </div>
        <div className="hidden gap-x-10 md:grid md:grid-cols-2 lg:col-span-8 lg:pt-4">
          {[data.trends.slice(0, half), data.trends.slice(half)].map((col, c) => (
            <div key={c} className="border-b border-line">
              {col.map((t, i) => (
                <TrendRow key={t.id} trend={t} index={c * half + i + 1} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
function Categories({ title, subtitle, data, index }) {
  const cats = data.categories;
  const hero = cats.length === 5;
  return (
    <Wrap>
      <SectionHeader index={index} eyebrow="Browse" title={title || 'Shop by category'} subtitle={subtitle} />
      <div className={`grid auto-rows-[170px] grid-cols-2 gap-2 sm:auto-rows-[240px] sm:gap-2.5 ${hero ? 'md:grid-cols-4 md:grid-rows-2 md:auto-rows-[300px]' : 'md:grid-cols-4'}`}>
        {cats.map((cat, i) => (
          <Reveal key={cat.id} delay={i * 60} className={hero && i === 0 ? 'col-span-2 md:row-span-2' : ''}>
            <CategoryCard category={cat} tall={hero && i === 0} index={i + 1} sizes={hero && i === 0 ? '(min-width: 768px) 50vw, 100vw' : '(min-width: 768px) 25vw, 50vw'} />
          </Reveal>
        ))}
      </div>
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
function FeaturedGuide({ data }) {
  const g = data.guide;
  return (
    <section className="bg-paper-2 py-14 md:py-0">
      <div className="container-x grid items-center gap-8 md:grid-cols-12 md:gap-12">
        <Link to={`/guides/${g.slug}`} className="group relative block md:col-span-7 md:-my-10">
          <HeroMedia motion={g.hero_motion} src={g.hero_image} alt={g.hero_image_alt || ''} aspect={4 / 3} width={1400} sizes="(min-width: 768px) 58vw, 100vw" imgClassName="group-hover:scale-[1.02]" />
          <div className="absolute top-3 left-3"><DemoBadge show={g.is_demo} /></div>
        </Link>
        <div className="md:col-span-5 md:py-20">
          <p className="eyebrow text-accent-ink">Featured guide</p>
          <h2 className="mt-4 font-serif text-headline">
            <Link to={`/guides/${g.slug}`} className="hover:text-ink-2">{g.title}</Link>
          </h2>
          {g.excerpt && <p className="mt-5 text-[1.08rem] leading-relaxed text-ink-2">{g.excerpt}</p>}
          <p className="eyebrow mt-6">
            {g.product_count} picks · Updated {formatDate(g.updated_at, { month: 'short', day: 'numeric' })}
          </p>
          <ButtonLink to={`/guides/${g.slug}`} className="mt-7" iconRight="arrow">Read the guide</ButtonLink>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
function ProductGrid({ title, subtitle, data, config, index }) {
  return (
    <Wrap>
      <SectionHeader index={index} eyebrow="Worth a closer look" title={title} subtitle={subtitle} link={config.link} />
      <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-12 md:gap-x-6 lg:grid-cols-4">
        {data.products.map((p, i) => (
          <Reveal key={p.id} delay={(i % 4) * 60}>
            <ProductCard product={p} cta="home_grid" />
          </Reveal>
        ))}
      </div>
    </Wrap>
  );
}

/**
 * Horizontal product carousel: native swipe/scroll with snapping, arrow
 * buttons that disable at either end, and a progress bar. The last card
 * finishes flush with the edge — no dead space after it.
 */
function ProductRail({ title, subtitle, data, config, index }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ atStart: true, atEnd: false, progress: 0, scrollable: false, thumb: 1 });

  const measure = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setPos({
      atStart: el.scrollLeft <= 2,
      atEnd: el.scrollLeft >= max - 2,
      progress: max > 0 ? el.scrollLeft / max : 0,
      scrollable: max > 2,
      thumb: el.scrollWidth ? el.clientWidth / el.scrollWidth : 1,
    });
  }, []);

  useEffect(() => {
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && ref.current) ro.observe(ref.current);
    return () => ro?.disconnect();
  }, [measure]);

  const step = (dir) => {
    const el = ref.current;
    const card = el?.firstElementChild;
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    // Move by the number of fully visible cards, so a page never skips a card.
    const perView = Math.max(1, Math.floor((el.clientWidth + gap) / (card.offsetWidth + gap)));
    el.scrollBy({ left: dir * perView * (card.offsetWidth + gap), behavior: 'smooth' });
  };

  const arrow = 'flex h-10 w-10 items-center justify-center rounded-full border transition-colors disabled:cursor-default disabled:opacity-30';
  return (
    <Wrap>
      <SectionHeader index={index} eyebrow="Shop" title={title} subtitle={subtitle} link={config.link} />
      <div
        ref={ref}
        onScroll={measure}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto overscroll-x-contain px-4 no-scrollbar sm:-mx-6 sm:scroll-px-6 sm:px-6 lg:mx-0 lg:scroll-px-0 lg:gap-6 lg:px-0"
        aria-label={`${title || 'Products'} — scroll for more`}
        tabIndex={0}
      >
        {data.products.map((p) => (
          <div key={p.id} className="w-[72%] shrink-0 snap-start sm:w-[44%] md:w-[31%] lg:w-[calc((100%-4.5rem)/4)]">
            <ProductCard product={p} cta="home_rail" size="sm" sizes="(min-width: 1024px) 25vw, (min-width: 640px) 44vw, 72vw" />
          </div>
        ))}
      </div>
      {pos.scrollable && (
        <div className="mt-6 flex items-center gap-5">
          <div className="relative h-px flex-1 bg-line" aria-hidden>
            <span
              className="absolute top-1/2 left-0 h-[3px] -translate-y-1/2 rounded-full bg-ink transition-[margin] duration-150"
              style={{ width: `${Math.max(pos.thumb * 100, 12)}%`, marginLeft: `${pos.progress * (100 - Math.max(pos.thumb * 100, 12))}%` }}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => step(-1)} disabled={pos.atStart} aria-label="Previous products" className={`${arrow} border-ink hover:bg-ink hover:text-paper`}>
              <Icon name="arrowLeft" size={16} />
            </button>
            <button type="button" onClick={() => step(1)} disabled={pos.atEnd} aria-label="More products" className={`${arrow} border-ink hover:bg-ink hover:text-paper`}>
              <Icon name="arrow" size={16} />
            </button>
          </div>
        </div>
      )}
    </Wrap>
  );
}

/** Dark, numbered list — the "Lazy but useful" treatment. */
function ProductNumbered({ title, subtitle, data, config }) {
  return (
    <section className="bg-ink py-16 text-paper md:py-24">
      <div className="container-x grid gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <h2 className="font-serif text-[clamp(3.2rem,2rem+5vw,6rem)] leading-[0.9] tracking-[-0.02em]">{title}</h2>
          {subtitle && <p className="mt-5 max-w-xs font-serif text-[1.6rem] leading-tight text-paper/70 italic">{subtitle}</p>}
          {config.link?.url && (
            <Link to={config.link.url} className="group mt-8 inline-flex items-center gap-2 text-sm font-medium">
              <span className="link-underline">{config.link.label || 'See all'}</span>
              <Icon name="arrow" size={16} className="transition-transform group-hover:translate-x-1" />
            </Link>
          )}
        </div>
        <ol className="lg:col-span-8">
          {data.products.map((p, i) => (
            <Reveal as="li" key={p.id} delay={i * 90} className="group grid grid-cols-[3rem_72px_1fr] items-center gap-4 border-t border-paper/15 py-5 sm:grid-cols-[4.5rem_96px_1fr_auto] sm:gap-6">
              <span className="font-serif text-[2.6rem] leading-none text-paper/25 transition-colors group-hover:text-accent sm:text-[3.4rem]">{pad(i + 1)}</span>
              <Link to={`/products/${p.slug}`}>
                <Img src={p.image?.url} alt="" aspect={1} width={200} sizes="96px" />
              </Link>
              <div className="min-w-0">
                <h3 className="text-[1.05rem] font-medium leading-snug">
                  <Link to={`/products/${p.slug}`} className="link-underline">{p.name}</Link>
                </h3>
                {p.short_description && <p className="mt-1 line-clamp-2 text-[0.9rem] text-paper/65">{p.short_description}</p>}
                <div className="mt-2 flex items-center gap-4 sm:hidden">
                  <PriceTag product={p} className="!text-paper/80" />
                  <AffiliateButton product={p} cta="home_numbered" variant="link" label="View" className="!text-paper" />
                </div>
              </div>
              <div className="hidden flex-col items-end gap-2 sm:flex">
                <PriceTag product={p} className="!text-paper/80" />
                <AffiliateButton product={p} cta="home_numbered" variant="link" className="!text-paper" />
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
/** Horizontal, snapping row used on phones so sections don't stack endlessly. */
function SwipeRow({ children, className = '' }) {
  return (
    <div className={`-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto overscroll-x-contain px-4 pb-1 no-scrollbar sm:-mx-6 sm:scroll-px-6 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}

function SplitFashion({ title, subtitle, data, index }) {
  const panels = data.panels;
  const allProducts = panels.flatMap((p) => p.products);
  return (
    <Wrap>
      <SectionHeader index={index} eyebrow="Fashion" title={title || 'Fashion'} subtitle={subtitle} />
      {/* Panels sit side by side at every size; on phones they're shorter and simpler. */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-6">
        {panels.map((panel, i) => (
          <div key={i}>
            <Link to={panel.url || '#'} className="group relative block overflow-hidden bg-ink">
              <Img src={panel.image || panel.category?.image_url} alt="" aspect={3 / 4} width={900} sizes="50vw" imgClassName="opacity-90 group-hover:scale-[1.03]" />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-transparent" aria-hidden />
              <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 p-3.5 text-paper sm:p-6 md:p-8">
                <div className="min-w-0">
                  <h3 className="font-serif text-[2rem] leading-none sm:text-[3.2rem] md:text-[4.2rem]">{panel.title}</h3>
                  {panel.subtitle && <p className="mt-2 hidden text-paper/85 sm:block">{panel.subtitle}</p>}
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper text-ink transition-colors group-hover:bg-accent group-hover:text-white sm:h-12 sm:w-12">
                  <Icon name="arrow" size={16} />
                </span>
              </div>
            </Link>
            {panel.products.length > 0 && (
              <div className="mt-5 hidden grid-cols-3 gap-3 md:grid">
                {panel.products.map((p) => (
                  <ProductCard key={p.id} product={p} size="sm" cta="home_fashion" sizes="16vw" />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Phones: one swipeable row with both panels' products. */}
      {allProducts.length > 0 && (
        <SwipeRow className="mt-5 md:hidden">
          {allProducts.map((p) => (
            <div key={p.id} className="w-[42%] shrink-0 snap-start">
              <ProductCard product={p} size="sm" cta="home_fashion" sizes="42vw" />
            </div>
          ))}
        </SwipeRow>
      )}
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
function Creator({ title, subtitle, data, index }) {
  return (
    <Wrap>
      <SectionHeader index={index} eyebrow="Creator & work" title={title} subtitle={subtitle} link={data.categories[0] ? { url: data.categories[0].path, label: 'Explore creator gear' } : null} />
      {data.categories.length > 0 && (
        <>
          <SwipeRow className="sm:hidden">
            {data.categories.map((c, i) => (
              <div key={c.id} className="h-[180px] w-[78%] shrink-0 snap-start">
                <CategoryCard category={c} index={i + 1} tall={false} sizes="78vw" />
              </div>
            ))}
          </SwipeRow>
          <div className="hidden auto-rows-[200px] gap-2.5 sm:grid sm:grid-cols-3">
            {data.categories.map((c, i) => (
              <CategoryCard key={c.id} category={c} index={i + 1} sizes="33vw" />
            ))}
          </div>
        </>
      )}
      {data.products.length > 0 && (
        <div className="mt-8 grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 md:mt-12 md:gap-x-6 md:gap-y-10 lg:grid-cols-4">
          {data.products.map((p) => (
            <ProductCard key={p.id} product={p} cta="home_creator" />
          ))}
        </div>
      )}
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
function Seasonal({ data }) {
  const { page, products, trends } = data;
  return (
    <section className="bg-accent-soft/60 py-10 md:py-20">
      <div className="container-x grid gap-6 lg:grid-cols-12 lg:gap-10">
        {/* Wide and short on phones, tall portrait beside the text on desktop. */}
        <Link to={`/seasonal/${page.slug}`} className="group relative block aspect-[16/10] overflow-hidden lg:col-span-5 lg:aspect-[4/5]">
          <Img src={page.hero_image} alt="" width={1000} sizes="(min-width: 1024px) 40vw, 100vw" imgClassName="group-hover:scale-[1.03]" />
        </Link>
        <div className="flex min-w-0 flex-col lg:col-span-7">
          <p className="eyebrow text-accent-ink">Seasonal · {page.eyebrow || page.title}</p>
          <h2 className="mt-3 font-serif text-headline md:mt-4">{page.hero_title || page.title}</h2>
          {page.hero_subtitle && <p className="mt-3 max-w-lg text-[0.98rem] leading-relaxed text-ink-2 md:mt-4 md:text-[1.05rem]">{page.hero_subtitle}</p>}
          {trends.length > 0 && (
            <div className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 no-scrollbar sm:mx-0 sm:flex-wrap sm:px-0 md:mt-6">
              {trends.map((t) => <div key={t.id} className="shrink-0"><TrendPill trend={t} /></div>)}
            </div>
          )}
          {products.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-4 md:mt-8">
              {products.slice(0, 4).map((p) => (
                <ProductCard key={p.id} product={p} size="sm" cta="home_seasonal" sizes="(min-width: 640px) 15vw, 45vw" />
              ))}
            </div>
          )}
          <div className="mt-auto pt-6 md:pt-8">
            <ButtonLink to={`/seasonal/${page.slug}`} variant="outline" iconRight="arrow" className="w-full sm:w-auto">All {page.title} finds</ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
function LatestGuides({ title, subtitle, data, index }) {
  const [lead, ...rest] = data.guides;
  return (
    <Wrap>
      <SectionHeader index={index} eyebrow="Buying guides" title={title || 'Latest buying guides'} subtitle={subtitle} link={{ url: '/guides', label: 'All guides' }} />
      <div className="grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7"><GuideCard guide={lead} variant="lead" /></div>
        <div className="lg:col-span-5">
          {rest.map((g) => <GuideCard key={g.id} guide={g} variant="row" />)}
        </div>
      </div>
    </Wrap>
  );
}

function Guides({ title, subtitle, data, index }) {
  return (
    <Wrap>
      <SectionHeader index={index} eyebrow="Guides" title={title || 'Buying guides'} subtitle={subtitle} />
      <div className="grid gap-x-6 gap-y-4 sm:gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {data.guides.map((g) => <GuideCard key={g.id} guide={g} />)}
      </div>
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
function Newsletter({ title, subtitle }) {
  const site = useSite();
  const n = site?.newsletter || {};
  if (!n.enabled) return null;
  return (
    <section className="py-10 md:py-24">
      <div className="container-x">
        <div className="grid gap-5 border-y-2 border-ink py-8 md:gap-10 md:py-16 lg:grid-cols-12">
          <h2 className="font-serif text-[clamp(2.2rem,1.4rem+4vw,5rem)] leading-[0.95] tracking-[-0.02em] lg:col-span-7">{title || n.headline}</h2>
          <div className="flex flex-col justify-end lg:col-span-5">
            <p className="mb-4 text-[0.98rem] leading-relaxed text-ink-2 md:mb-6 md:text-[1.05rem]">{subtitle || n.subtext}</p>
            <NewsletterForm source="homepage" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Links({ title, config, index }) {
  const links = (config.links || []).filter((l) => safeHref(l.url));
  if (!links.length) return null;
  return (
    <Wrap>
      <SectionHeader index={index} eyebrow="Explore" title={title || 'Related searches'} />
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <Link key={l.url + l.label} to={l.url} className="rounded-full border border-line-strong bg-card px-4 py-2 text-[0.92rem] transition-colors hover:border-ink">
            {l.label}
          </Link>
        ))}
      </div>
    </Wrap>
  );
}

function Text({ title, config }) {
  return (
    <Wrap>
      <div className="mx-auto max-w-2xl">
        {title && <h2 className="font-serif text-title">{title}</h2>}
        {config.body && <p className="prose-editorial mt-4"><Inline text={config.body} /></p>}
      </div>
    </Wrap>
  );
}

// ---------------------------------------------------------------------------
const PRODUCT_VARIANTS = { grid: ProductGrid, rail: ProductRail, numbered: ProductNumbered, lazy: ProductNumbered };
const TYPES = {
  hero: Hero,
  trending: Trending,
  categories: Categories,
  featured_guide: FeaturedGuide,
  split_fashion: SplitFashion,
  creator: Creator,
  seasonal: Seasonal,
  latest_guides: LatestGuides,
  guides: Guides,
  newsletter: Newsletter,
  links: Links,
  text: Text,
};

/** Renders resolved sections in order; numbered headers count only sections that show one. */
export default function SectionRenderer({ sections }) {
  let n = 0;
  return sections.map((s) => {
    const Component = s.type === 'products' ? PRODUCT_VARIANTS[s.config?.variant] || ProductGrid : TYPES[s.type];
    if (!Component) return null;
    const numbered = !['hero', 'featured_guide', 'newsletter', 'seasonal', 'text'].includes(s.type) && !(s.type === 'products' && ['numbered', 'lazy'].includes(s.config?.variant));
    if (numbered) n += 1;
    const { key, ...props } = s;
    return <Component key={key || s.id} {...props} config={s.config || {}} index={numbered ? n : undefined} />;
  });
}
