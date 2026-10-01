import { Link, useParams } from 'react-router-dom';
import { useFetch } from '../lib/useFetch.js';
import { usePageView } from '../lib/hooks.js';
import { Seo, breadcrumbLd } from '../lib/seo.jsx';
import { formatDate } from '../lib/format.js';
import { useSite } from '../context/SiteContext.jsx';
import Img from '../components/ui/Img.jsx';
import Badge from '../components/ui/Badge.jsx';
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx';
import SectionRenderer from '../components/sections/Sections.jsx';
import { EmptyState, ErrorState, PageSkeleton, CardGridSkeleton } from '../components/ui/States.jsx';
import NotFound from './NotFound.jsx';

export function SeasonalIndex() {
  const { data, error, loading, reload } = useFetch('/seasonal');
  usePageView({ ready: Boolean(data) });
  return (
    <>
      <Seo title="Seasonal shopping" description="Costumes, outfits, gifts and decor for every season — organised by what people are searching for." path="/seasonal" />
      <header className="container-x pt-6 md:pt-16">
        <p className="eyebrow">By season</p>
        <h1 className="mt-4 font-serif text-[clamp(3rem,1.6rem+6vw,6.5rem)] leading-[0.9] tracking-[-0.025em]">Shop the season.</h1>
      </header>
      <div className="container-x mt-12">
        {error && !data && <ErrorState error={error} onRetry={reload} />}
        {loading && !data && <CardGridSkeleton count={3} aspect="aspect-[4/5]" />}
        {data && !data.length && <EmptyState title="No seasonal pages yet" action={{ url: '/trending', label: 'See what is trending' }} />}
        <div className="grid gap-x-6 gap-y-12 md:grid-cols-3">
          {(data || []).map((s) => (
            <Link key={s.id} to={`/seasonal/${s.slug}`} className="group block">
              <div className="relative">
                <Img src={s.hero_image} alt="" aspect={4 / 5} width={800} sizes="(min-width: 768px) 33vw, 100vw" imgClassName="group-hover:scale-[1.03]" />
                {s.is_current && <Badge tone="accent" className="absolute top-3 left-3">Now</Badge>}
              </div>
              <p className="eyebrow mt-4">{s.eyebrow}</p>
              <h2 className="mt-1 font-serif text-[2.4rem] leading-none">{s.title}</h2>
              {s.hero_subtitle && <p className="mt-2 text-muted">{s.hero_subtitle}</p>}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}

export function SeasonalPage() {
  const { slug } = useParams();
  const site = useSite();
  const { data: s, error, loading, reload } = useFetch(`/seasonal/${slug}`);
  usePageView({ entityType: 'seasonal_page', entityId: s?.id, ready: Boolean(s) });

  if (loading && !s) return <PageSkeleton />;
  if (error?.response?.status === 404) return <NotFound />;
  if (error) return <div className="container-x py-20"><ErrorState error={error} onRetry={reload} /></div>;
  if (!s) return null;
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Seasonal', to: '/seasonal' }, { label: s.title, to: `/seasonal/${s.slug}` }];

  return (
    <>
      <Seo title={s.hero_title || s.title} description={s.hero_subtitle} seo={s.seo} image={s.hero_image} path={`/seasonal/${s.slug}`} jsonLd={breadcrumbLd(crumbs, site?.site?.url || location.origin)} />
      <header className="relative isolate overflow-hidden bg-ink text-paper">
        <div className="absolute inset-0 -z-10 opacity-60">
          <Img src={s.hero_image} alt="" priority width={1800} sizes="100vw" />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/70 to-ink/10" aria-hidden />
        <div className="container-x py-16 md:py-28">
          <Breadcrumbs items={crumbs} className="[&_*]:!text-paper/70" />
          <p className="eyebrow mt-12 text-accent-soft">{s.eyebrow}{s.season_end ? ` · through ${formatDate(s.season_end, { month: 'long', day: 'numeric' })}` : ''}</p>
          <h1 className="mt-4 max-w-3xl font-serif text-[clamp(3rem,1.6rem+6vw,7rem)] leading-[0.9] tracking-[-0.025em]">{s.hero_title || s.title}</h1>
          {s.hero_subtitle && <p className="mt-6 max-w-xl text-[1.15rem] leading-relaxed text-paper/85">{s.hero_subtitle}</p>}
        </div>
      </header>
      {s.sections.length ? (
        <SectionRenderer sections={s.sections} />
      ) : (
        <div className="container-x py-16"><EmptyState title="Finds coming soon" body="We're putting this season's picks together." /></div>
      )}
    </>
  );
}
