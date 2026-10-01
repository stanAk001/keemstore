import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../lib/useFetch.js';
import { usePageView } from '../lib/hooks.js';
import { Seo, breadcrumbLd } from '../lib/seo.jsx';
import { STATUS_LABEL } from '../lib/format.js';
import { useSite } from '../context/SiteContext.jsx';
import TrendCard from '../components/cards/TrendCard.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import GuideCard from '../components/cards/GuideCard.jsx';
import Img from '../components/ui/Img.jsx';
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx';
import { ButtonLink } from '../components/ui/Button.jsx';
import { EmptyState, ErrorState, CardGridSkeleton, PageSkeleton } from '../components/ui/States.jsx';
import NotFound from './NotFound.jsx';

const ORDER = ['trending', 'rising', 'approaching', 'seasonal', 'evergreen'];

export function TrendingIndex() {
  const { data, error, loading, reload } = useFetch('/trends?limit=60');
  usePageView({ ready: Boolean(data) });
  const groups = ORDER.map((s) => [s, (data || []).filter((t) => t.trend_status === s)]).filter(([, items]) => items.length);

  return (
    <>
      <Seo title="Trending now" description="What people are searching for right now, and the guides and products worth a look." path="/trending" />
      <header className="container-x pt-6 md:pt-16">
        <p className="eyebrow flex items-center gap-2"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />Updated through the season</p>
        <h1 className="mt-4 max-w-4xl font-serif text-[clamp(3rem,1.6rem+6vw,6.5rem)] leading-[0.9] tracking-[-0.025em]">What people are looking for right now.</h1>
      </header>
      <div className="container-x mt-14 space-y-20">
        {error && !data && <ErrorState error={error} onRetry={reload} />}
        {loading && !data && <CardGridSkeleton aspect="aspect-[3/4]" />}
        {data && !data.length && <EmptyState title="No trends right now" body="Check back soon — we update this page as searches shift." action={{ url: '/guides', label: 'Browse buying guides' }} />}
        {groups.map(([status, items]) => (
          <section key={status}>
            <h2 className="mb-8 border-t border-ink pt-4 font-serif text-title">{STATUS_LABEL[status]}</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4">
              {items.map((t) => <TrendCard key={t.id} trend={t} />)}
            </div>
          </section>
        ))}
      </div>
    </>
  );
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

  return (
    <>
      <Seo title={t.title} description={t.description} seo={t.seo} image={t.image_url} path={`/trending/${t.slug}`} jsonLd={breadcrumbLd(crumbs, site?.site?.url || location.origin)} />
      <header className="container-x grid gap-10 pt-8 md:pt-12 lg:grid-cols-12 lg:items-end">
        <div className="lg:col-span-7">
          <Breadcrumbs items={crumbs} />
          <p className="eyebrow mt-6 sm:mt-10 text-accent-ink">{STATUS_LABEL[t.trend_status]}</p>
          <h1 className="mt-3 font-serif text-[clamp(3rem,1.6rem+6vw,6.5rem)] leading-[0.9] tracking-[-0.025em]">{t.title}</h1>
          {t.keyword && <p className="mt-4 font-mono text-sm text-muted">People are searching: “{t.keyword}”</p>}
          {t.description && <p className="mt-5 max-w-xl text-[1rem] leading-relaxed text-ink-2 sm:text-[1.1rem]">{t.description}</p>}
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
          <h2 className="mb-8 border-t border-ink pt-4 font-serif text-headline">Finds for this trend</h2>
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-12 md:gap-x-6 lg:grid-cols-4">
            {t.products.map((p) => <ProductCard key={p.id} product={p} cta="trend_page" />)}
          </div>
        </section>
      )}
      {t.guides.length > 0 && (
        <section className="container-x mt-20">
          <h2 className="mb-8 border-t border-ink pt-4 font-serif text-headline">Related guides</h2>
          <div className="grid gap-x-6 gap-y-4 sm:gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{t.guides.map((g) => <GuideCard key={g.id} guide={g} />)}</div>
        </section>
      )}
      <div className="container-x mt-16">
        <Link to="/trending" className="text-sm font-medium underline decoration-accent underline-offset-4">← All trends</Link>
      </div>
    </>
  );
}
