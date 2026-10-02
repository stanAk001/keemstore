import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../lib/useFetch.js';
import { usePageView } from '../lib/hooks.js';
import { Seo, breadcrumbLd } from '../lib/seo.jsx';
import { STATUS_LABEL, pad } from '../lib/format.js';
import { useSite } from '../context/SiteContext.jsx';
import TrendCard, { TrendRow, trendMonth } from '../components/cards/TrendCard.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import GuideCard from '../components/cards/GuideCard.jsx';
import Img from '../components/ui/Img.jsx';
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx';
import { ButtonLink } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState, CardGridSkeleton, PageSkeleton } from '../components/ui/States.jsx';
import NotFound from './NotFound.jsx';

const ORDER = ['trending', 'rising', 'approaching', 'seasonal', 'evergreen'];

// One line under each edit's heading. Edits without a line just show their name.
const EDIT_BLURB = {
  'The Beauty Shelf': 'Makeup, skincare and body care — the beauty searches growing fastest this month.',
  'Cold-Weather Wardrobe': 'Boots, coats and the cosy pieces people are buying as the temperature drops.',
  'Home for the Holidays': 'Decorating, baking and fireside evenings — the home side of the season.',
  'Projects at Home': 'Garden jobs, slow-cooker dinners and gaming-room makeovers.',
};

export function TrendingIndex() {
  const { data, error, loading, reload } = useFetch('/trends?limit=60');
  usePageView({ ready: Boolean(data) });
  const trends = data || [];
  const month = trends.map(trendMonth).find(Boolean);
  // The board: every trend with a measured growth figure, in rank order.
  const board = trends.filter((t) => t.growth);
  const half = Math.ceil(board.length / 2);
  // Edits in the order their top trend ranks; everything else grouped by status.
  const edits = [...new Set(board.map((t) => t.edit).filter(Boolean))].map((name) => [name, trends.filter((t) => t.edit === name)]);
  const rest = ORDER.map((s) => [s, trends.filter((t) => !t.edit && t.trend_status === s)]).filter(([, items]) => items.length);

  return (
    <>
      <Seo title="Trending now" description="This month's fastest-growing shopping searches on Pinterest, and the products worth buying for each." path="/trending" />
      <header className="container-x pt-6 md:pt-16">
        <p className="eyebrow flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          {month ? `Pinterest Trends · United States · ${month}` : 'Updated through the season'}
        </p>
        <h1 className="mt-4 max-w-4xl font-serif text-[clamp(3rem,1.6rem+6vw,6.5rem)] leading-[0.9] tracking-[-0.025em]">What people are looking for right now.</h1>
        {board.length > 0 && (
          <p className="mt-6 max-w-2xl text-[1rem] leading-relaxed text-ink-2 sm:text-[1.12rem]">
            Every month we read Pinterest’s fastest-growing shopping searches, then pick the products actually worth buying for each one.
          </p>
        )}
      </header>

      <div className="container-x mt-14 space-y-24">
        {error && !data && <ErrorState error={error} onRetry={reload} />}
        {loading && !data && <CardGridSkeleton aspect="aspect-[3/4]" />}
        {data && !data.length && <EmptyState title="No trends right now" body="Check back soon — we update this page as searches shift." action={{ url: '/guides', label: 'Browse buying guides' }} />}

        {board.length > 0 && (
          <section aria-labelledby="board-title">
            <div className="flex flex-wrap items-end justify-between gap-3 border-t border-ink pt-4">
              <h2 id="board-title" className="font-serif text-title">The board</h2>
              <p className="font-mono text-[0.72rem] text-muted">Growth = change in Pinterest searches, month over month</p>
            </div>
            <div className="mt-4 grid gap-x-10 md:grid-cols-2">
              {[board.slice(0, half), board.slice(half)].map((col, c) => (
                <div key={c} className="border-b border-line">
                  {col.map((t, i) => <TrendRow key={t.id} trend={{ ...t, href: t.page_url }} index={c * half + i + 1} />)}
                </div>
              ))}
            </div>
          </section>
        )}

        {edits.map(([name, items]) => (
          <section key={name}>
            <div className="border-t border-ink pt-4">
              <p className="eyebrow">The edit</p>
              <h2 className="mt-2 font-serif text-headline">{name}</h2>
              {EDIT_BLURB[name] && <p className="mt-2 max-w-xl text-ink-2">{EDIT_BLURB[name]}</p>}
            </div>
            <div className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {items.map((t) => <TrendCard key={t.id} trend={t} />)}
            </div>
          </section>
        ))}

        {rest.map(([status, items], i) => (
          <section key={status}>
            <h2 className="mb-8 border-t border-ink pt-4 font-serif text-title">
              {board.length && i === 0 ? `Also on our radar · ${STATUS_LABEL[status]}` : STATUS_LABEL[status]}
            </h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {items.map((t) => <TrendCard key={t.id} trend={t} />)}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

/** "#1 shopping trend in the US" from a source like "Pinterest Trends · shopping · #1 in the US". */
function rankLabel(source) {
  const m = String(source || '').match(/shopping · #(\d+)/);
  return m ? `#${m[1]} shopping trend in the US` : /search/.test(source || '') ? 'Fast-growing search' : null;
}

export function TrendPage() {
  const { slug } = useParams();
  const site = useSite();
  const { data: t, error, loading, reload } = useFetch(`/trends/${slug}`);
  usePageView({ entityType: 'trend', entityId: t?.id, ready: Boolean(t) });

  if (loading && !t) return <PageSkeleton />;
  if (error?.response?.status === 404) return <NotFound />;
  if (error) return <div className="container-x py-20"><ErrorState error={error} onRetry={reload} /></div>;
  if (!t) return null;
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Trending', to: '/trending' }, { label: t.title, to: `/trending/${t.slug}` }];
  const cta = t.guide ? { to: `/guides/${t.guide.slug}`, label: 'Read the guide' } : t.href !== t.page_url ? { to: t.href, label: 'Shop this trend' } : null;
  const month = trendMonth(t);
  const rank = rankLabel(t.source);

  return (
    <>
      <Seo title={t.title} description={t.description} seo={t.seo} image={t.image_url} path={`/trending/${t.slug}`} jsonLd={breadcrumbLd(crumbs, site?.site?.url || location.origin)} />
      <header className="container-x grid gap-10 pt-8 md:pt-12 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Breadcrumbs items={crumbs} />
          {t.growth ? (
            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 sm:mt-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-card py-1 pr-3 pl-1.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent font-serif text-[0.7rem] text-white" aria-hidden>P</span>
                <span className="text-[0.82rem] font-medium">Trending on Pinterest</span>
              </span>
              <span className="text-[0.86rem] text-ink-2">
                <span className="font-mono font-medium text-good">{t.growth}</span> {t.growth_note}
                {month && <span className="text-muted"> · {month}</span>}
              </span>
            </div>
          ) : (
            <p className="eyebrow mt-6 sm:mt-10 text-accent-ink">{STATUS_LABEL[t.trend_status]}</p>
          )}
          <h1 className="mt-4 font-serif text-[clamp(3rem,1.6rem+6vw,6.5rem)] leading-[0.9] tracking-[-0.025em]">{t.title}</h1>
          {rank && <p className="mt-3 font-mono text-[0.78rem] tracking-wide text-muted uppercase">{rank}{t.edit && ` · ${t.edit}`}</p>}
          {t.description && <p className="mt-5 max-w-xl text-[1rem] leading-relaxed text-ink-2 sm:text-[1.1rem]">{t.description}</p>}
          {t.keyword && <p className="mt-4 font-mono text-sm text-muted">People are searching: “{t.keyword}”</p>}
          {cta && <ButtonLink to={cta.to} className="mt-8" iconRight="arrow">{cta.label}</ButtonLink>}
        </div>
        <div className="lg:col-span-5">
          <Img src={t.image_url} alt={t.title} aspect={4 / 5} priority width={900} sizes="(min-width: 1024px) 40vw, 100vw" />
        </div>
      </header>

      {t.guide && (
        <section className="container-x mt-20">
          <p className="eyebrow mb-6 border-t border-ink pt-4">The guide</p>
          <div className="max-w-3xl"><GuideCard guide={t.guide} variant="lead" /></div>
        </section>
      )}
      {t.products.length > 0 && (
        <section className="container-x mt-20">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3 border-t border-ink pt-4">
            <h2 className="font-serif text-headline">Shop the trend</h2>
            <p className="font-mono text-[0.72rem] text-muted">{pad(t.products.length)} picks · chosen by our editors</p>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-12 md:gap-x-6 lg:grid-cols-4">
            {t.products.map((p, i) => <ProductCard key={p.id} product={p} cta="trend_page" priority={i < 4} />)}
          </div>
        </section>
      )}
      {t.guides.length > 0 && (
        <section className="container-x mt-20">
          <h2 className="mb-8 border-t border-ink pt-4 font-serif text-headline">Related guides</h2>
          <div className="grid gap-x-6 gap-y-4 sm:gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{t.guides.map((g) => <GuideCard key={g.id} guide={g} />)}</div>
        </section>
      )}
      {t.related?.length > 0 && (
        <section className="container-x mt-20">
          <div className="border-t border-ink pt-4">
            <p className="eyebrow">More from the edit</p>
            <h2 className="mt-2 mb-8 font-serif text-headline">{t.edit}</h2>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-6">
            {t.related.map((r) => <TrendCard key={r.id} trend={r} />)}
          </div>
        </section>
      )}
      <div className="container-x mt-16">
        <Link to="/trending" className="text-sm font-medium underline decoration-accent underline-offset-4">← All trends</Link>
      </div>
    </>
  );
}
