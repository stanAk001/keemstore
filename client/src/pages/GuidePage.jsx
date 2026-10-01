import { useMemo, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useFetch } from '../lib/useFetch.js';
import { usePageView } from '../lib/hooks.js';
import { Seo, breadcrumbLd, itemListLd } from '../lib/seo.jsx';
import { stripInline } from '../lib/inline.jsx';
import { formatDate } from '../lib/format.js';
import { useSite } from '../context/SiteContext.jsx';
import { TrackingScope } from '../context/TrackingContext.jsx';
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx';
import { HeroMedia } from '../components/motion/index.jsx';
import Badge from '../components/ui/Badge.jsx';
import { ErrorState, PageSkeleton } from '../components/ui/States.jsx';
import BlockRenderer, { headingId } from '../components/guide/BlockRenderer.jsx';
import TableOfContents from '../components/guide/TableOfContents.jsx';
import FAQ from '../components/guide/FAQ.jsx';
import { FeaturedProductCard, PickCard, QuickVerdict, ProductComparison } from '../components/product/GuidePicks.jsx';
import GuideCard from '../components/cards/GuideCard.jsx';
import NewsletterForm from '../components/NewsletterForm.jsx';
import NotFound from './NotFound.jsx';
import { ReadingProgress } from '../components/motion/effects.jsx';

function Disclosure({ text }) {
  return (
    <p className="border-y border-line py-3 text-[0.82rem] leading-relaxed text-muted">
      <span className="eyebrow mr-2 text-ink">Disclosure</span>
      {text}{' '}
      <Link to="/affiliate-disclosure" className="underline decoration-line-strong underline-offset-2 hover:text-ink">How we make money</Link>
    </p>
  );
}

export default function GuidePage() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const preview = params.get('preview') === '1';
  const site = useSite();
  const articleRef = useRef(null);
  const { data: g, error, loading, reload } = useFetch(`/guides/${slug}${preview ? '?preview=1' : ''}`, { cacheable: !preview });
  usePageView({ entityType: 'guide', entityId: g?.id, ready: Boolean(g) && !preview });

  const toc = useMemo(() => {
    if (!g) return [];
    const items = [];
    // Same order as the page: article headings, then picks and the fixed sections.
    for (const b of g.content) if (b.type === 'heading' && b.level !== 3) items.push({ id: headingId(b.text), label: stripInline(b.text), level: 2 });
    if (g.picks.length) items.push({ id: 'our-picks', label: 'Our picks', level: 2 });
    if (g.picks.length > 1) items.push({ id: 'compare', label: 'Compare at a glance', level: 2 });
    if (g.buying_considerations.length) items.push({ id: 'buying-advice', label: 'Before you buy', level: 2 });
    if (g.faq.length) items.push({ id: 'faq', label: 'Questions', level: 2 });
    return items;
  }, [g]);

  if (loading && !g) return <PageSkeleton />;
  if (error?.response?.status === 404) return <NotFound />;
  if (error) return <div className="container-x py-20"><ErrorState error={error} onRetry={reload} /></div>;
  if (!g) return null;

  const siteUrl = site?.site?.url || window.location.origin;
  const crumbs = [
    { label: 'Home', to: '/' },
    { label: 'Guides', to: '/guides' },
    ...(g.category_parent_path ? [{ label: g.category_parent_name, to: g.category_parent_path }] : []),
    ...(g.category_name ? [{ label: g.category_name, to: g.category_path }] : []),
    { label: g.title },
  ];
  const pickProducts = g.picks.map((p) => g.products[p.product_id]).filter(Boolean);
  const [top, ...rest] = g.picks;

  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: g.title,
      description: g.excerpt || g.subtitle,
      image: g.hero_image ? [g.hero_image] : undefined,
      datePublished: g.published_at,
      dateModified: g.updated_at,
      author: g.author_name ? { '@type': 'Person', name: g.author_name } : undefined,
      publisher: { '@type': 'Organization', name: site?.site?.name },
      mainEntityOfPage: `${siteUrl}/guides/${g.slug}`,
    },
    breadcrumbLd(crumbs.map((c, i) => (i === crumbs.length - 1 ? { label: c.label, to: `/guides/${g.slug}` } : c)), siteUrl),
    pickProducts.length ? itemListLd(g.title, pickProducts, siteUrl) : null,
    g.faq.length
      ? { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: g.faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: stripInline(f.a) } })) }
      : null,
  ].filter(Boolean);

  return (
    <TrackingScope guideId={g.id} categoryId={g.primary_category_id}>
      <ReadingProgress targetRef={articleRef} />
      <Seo title={g.title} description={g.excerpt || g.subtitle} seo={g.seo} image={g.hero_image} type="article" path={`/guides/${g.slug}`}
        publishedAt={g.published_at} modifiedAt={g.updated_at} jsonLd={jsonLd} noindex={preview} />

      {preview && (
        <div className="sticky top-16 z-30 bg-accent py-2 text-center text-sm font-medium text-white lg:top-[4.5rem]">
          Preview — status: {g.status}. {g.is_live ? 'This guide is live.' : 'Not visible to the public.'}
          <Link to={`/admin/guides/${g.id}`} className="ml-3 underline">Back to editor</Link>
        </div>
      )}

      <article ref={articleRef}>
        <header className="container-x pt-5 md:pt-12">
          <Breadcrumbs items={crumbs} />
          <div className="mt-8 max-w-4xl">
            <div className="flex flex-wrap items-center gap-2">
              {g.category_name && <Link to={g.category_path}><Badge tone="soft">{g.category_name}</Badge></Link>}
              {g.is_demo && <Badge tone="neutral">Demo content</Badge>}
            </div>
            <h1 className="mt-5 font-serif text-[clamp(2.6rem,1.4rem+4.6vw,5.4rem)] leading-[0.95] tracking-[-0.02em]">{g.title}</h1>
            {g.subtitle && <p className="mt-5 max-w-2xl font-serif text-[1.45rem] leading-snug text-ink-2 italic md:text-[1.7rem]">{g.subtitle}</p>}
            <p className="eyebrow mt-7 flex flex-wrap gap-x-5 gap-y-1">
              {g.author_name && <span>By <span className="text-ink">{g.author_name}</span></span>}
              <span>Updated <time dateTime={g.updated_at}>{formatDate(g.updated_at)}</time></span>
              {g.picks.length > 0 && <span>{g.picks.length} picks</span>}
            </p>
          </div>
        </header>

        {(g.hero_image || g.hero_motion) && (
          <div className="container-x mt-10">
            <HeroMedia motion={g.hero_motion} motionClassName="aspect-[4/5] sm:aspect-[16/9] lg:aspect-[2/1]" src={g.hero_image} alt={g.hero_image_alt || ''} aspect={16 / 8} priority width={1800} sizes="(min-width: 1320px) 1240px, 100vw" className="-mx-4 sm:mx-0" />
          </div>
        )}

        <div className="container-x mt-10 grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,720px)_1fr]">
          <aside className="hidden lg:block">
            <div className="sticky top-28"><TableOfContents items={toc} /></div>
          </aside>

          <div className="min-w-0">
            {site?.affiliate?.disclosure_short && <Disclosure text={site.affiliate.disclosure_short} />}
            <div className="mt-8">
              <QuickVerdict picks={g.picks} products={g.products} answer={g.quick_answer} />
            </div>

            <div className="prose-editorial mt-10">
              <BlockRenderer blocks={g.content} products={g.products} />
            </div>

            {top && (
              <section id="our-picks" className="mt-16 scroll-mt-28">
                <h2 className="mb-8 font-serif text-[2.4rem] leading-none">Our picks</h2>
                <FeaturedProductCard product={g.products[top.product_id]} label={top.label} note={top.note} index={1} />
                <div className="mt-14 space-y-14">
                  {rest.map((pick, i) => (
                    <PickCard key={pick.product_id} product={g.products[pick.product_id]} label={pick.label} note={pick.note} index={i + 2} flip={i % 2 === 1} />
                  ))}
                </div>
              </section>
            )}

            {g.picks.length > 1 && (
              <section id="compare" className="mt-20 scroll-mt-28">
                <h2 className="mb-6 font-serif text-[2.1rem] leading-none">Compare at a glance</h2>
                <ProductComparison picks={g.picks} products={g.products} />
              </section>
            )}

            {g.buying_considerations.length > 0 && (
              <section id="buying-advice" className="mt-20 scroll-mt-28">
                <h2 className="font-serif text-[2.1rem] leading-none">Before you buy</h2>
                <div className="prose-editorial"><BlockRenderer blocks={g.buying_considerations} products={g.products} /></div>
              </section>
            )}

            {g.faq.length > 0 && (
              <section id="faq" className="mt-20 scroll-mt-28">
                <h2 className="mb-6 font-serif text-[2.1rem] leading-none">Questions</h2>
                <FAQ items={g.faq} />
              </section>
            )}

            {g.author_name && (
              <footer className="mt-16 flex gap-4 border-t border-ink pt-6">
                <div>
                  <p className="eyebrow">Written by</p>
                  <p className="mt-1 font-medium">{g.author_name}</p>
                  {g.author_bio && <p className="mt-1 max-w-lg text-[0.92rem] text-muted">{g.author_bio}</p>}
                  <Link to="/editorial-policy" className="mt-2 inline-block text-[0.85rem] underline decoration-line-strong underline-offset-2">How we choose products</Link>
                </div>
              </footer>
            )}
          </div>
        </div>
      </article>

      {g.related_guides.length > 0 && (
        <section className="container-x mt-24">
          <div className="border-t border-ink pt-4">
            <p className="eyebrow">Keep reading</p>
            <h2 className="mt-3 mb-10 font-serif text-headline">Related guides</h2>
          </div>
          <div className="grid gap-x-6 gap-y-4 sm:gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {g.related_guides.slice(0, 3).map((r) => <GuideCard key={r.id} guide={r} />)}
          </div>
        </section>
      )}

      {site?.newsletter?.enabled && <section className="container-x mt-24">
        <div className="grid gap-8 bg-ink p-8 text-paper md:grid-cols-2 md:p-12">
          <h2 className="font-serif text-[2.4rem] leading-none md:text-[3rem]">{site?.newsletter?.headline}</h2>
          <div className="flex flex-col justify-end">
            <p className="mb-5 text-paper/75">{site?.newsletter?.subtext}</p>
            <NewsletterForm source={`guide:${g.slug}`} dark />
          </div>
        </div>
      </section>}
    </TrackingScope>
  );
}
