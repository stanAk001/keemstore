import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useFetch } from '../lib/useFetch.js';
import { usePageView } from '../lib/hooks.js';
import { Seo, breadcrumbLd, itemListLd } from '../lib/seo.jsx';
import { useSite } from '../context/SiteContext.jsx';
import { TrackingScope } from '../context/TrackingContext.jsx';
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx';
import Img from '../components/ui/Img.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { EmptyState, ErrorState, PageSkeleton, CardGridSkeleton } from '../components/ui/States.jsx';
import FilterBar, { priceParams } from '../components/FilterBar.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import GuideCard from '../components/cards/GuideCard.jsx';
import { TrendPill } from '../components/cards/TrendCard.jsx';
import NotFound from './NotFound.jsx';

export default function CategoryPage() {
  const { parent, child } = useParams();
  const [params, setParams] = useSearchParams();
  const site = useSite();
  const path = [parent, child].filter(Boolean).join('/');

  const get = (k) => params.get(k) || '';
  const set = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next, { replace: false, preventScrollReset: true });
  };

  const api = new URLSearchParams({ path, ...priceParams(get('price')) });
  for (const k of ['brand', 'tag', 'featured', 'sort', 'page', 'sub']) if (get(k)) api.set(k, get(k));
  const { data, error, loading, reload } = useFetch(`/categories/by-path?${api}`);
  usePageView({ entityType: 'category', entityId: data?.category?.id, ready: Boolean(data) });

  if (loading && !data) return <PageSkeleton />;
  if (error?.response?.status === 404) return <NotFound />;
  if (error && !data) return <div className="container-x py-20"><ErrorState error={error} onRetry={reload} /></div>;
  if (!data) return null;

  const { category: c, parent: p, children, products, facets, guides, trends } = data;
  const siteUrl = site?.site?.url || window.location.origin;
  const crumbs = [{ label: 'Home', to: '/' }, ...(p ? [{ label: p.name, to: p.path }] : []), { label: c.name, to: c.path }];
  const showGuides = get('type') === 'guides';

  return (
    <TrackingScope categoryId={c.id}>
      <Seo title={c.name} description={c.description} seo={c.seo} image={c.image_url} path={c.path}
        noindex={[...params.keys()].some((k) => k !== 'page')}
        jsonLd={[breadcrumbLd(crumbs, siteUrl), products.items.length ? itemListLd(c.name, products.items, siteUrl) : null].filter(Boolean)} />

      <header className="container-x pt-5 md:pt-12">
        <Breadcrumbs items={crumbs} />
        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h1 className="font-serif text-[clamp(3rem,1.6rem+6vw,6.5rem)] leading-[0.9] tracking-[-0.025em]">{c.name}</h1>
            {c.description && <p className="mt-5 max-w-xl text-[1rem] leading-relaxed text-ink-2 sm:text-[1.15rem]">{c.description}</p>}
            {c.intro && <p className="mt-3 hidden max-w-xl leading-relaxed text-muted sm:block">{c.intro}</p>}
          </div>
          {c.image_url && (
            <div className="hidden lg:col-span-5 lg:block">
              <Img src={c.image_url} alt={c.image_alt || ''} aspect={16 / 10} priority width={900} sizes="40vw" />
            </div>
          )}
        </div>

        {children.length > 0 && (
          <nav className="mt-10 flex flex-wrap gap-2" aria-label={`${c.name} subcategories`}>
            <button onClick={() => set({ sub: '', page: '' })} className={`rounded-full border px-4 py-1.5 text-[0.88rem] ${!get('sub') ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink'}`}>
              All {c.name.toLowerCase()}
            </button>
            {children.map((k) => (
              <Link key={k.id} to={k.path} className="rounded-full border border-line-strong px-4 py-1.5 text-[0.88rem] hover:border-ink">
                {k.name}
              </Link>
            ))}
          </nav>
        )}
        {trends.length > 0 && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="eyebrow mr-1">Trending in {c.name}</span>
            {trends.map((t) => <TrendPill key={t.id} trend={t} />)}
          </div>
        )}
      </header>

      <section className="container-x mt-10">
        <FilterBar facets={facets} get={get} set={set} total={products.total} showContentType={guides.length > 0} />
        <div className="mt-10">
          {showGuides ? (
            guides.length ? (
              <div className="grid gap-x-6 gap-y-4 sm:gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{guides.map((g) => <GuideCard key={g.id} guide={g} />)}</div>
            ) : (
              <EmptyState title="No guides here yet" body="We haven't published a guide for this category yet." action={{ url: '/guides', label: 'Browse all guides' }} />
            )
          ) : loading ? (
            <CardGridSkeleton />
          ) : products.items.length ? (
            <>
              <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
                {products.items.map((prod, i) => <ProductCard key={prod.id} product={prod} cta="category_grid" priority={i < 4} />)}
              </div>
              <Pagination page={products.page} pages={products.pages} onChange={(n) => { set({ page: n > 1 ? String(n) : '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />
            </>
          ) : (
            <EmptyState
              title="Nothing matches those filters"
              body="Try a wider price range or clear the filters to see everything in this category."
              action={{ url: c.path, label: `See all ${c.name.toLowerCase()}` }}
            />
          )}
        </div>
      </section>

      {!showGuides && guides.length > 0 && (
        <section className="container-x mt-24">
          <div className="border-t border-ink pt-4">
            <p className="eyebrow">Before you buy</p>
            <h2 className="mt-3 mb-10 font-serif text-headline">{c.name} buying guides</h2>
          </div>
          <div className="grid gap-x-6 gap-y-4 sm:gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{guides.slice(0, 3).map((g) => <GuideCard key={g.id} guide={g} />)}</div>
        </section>
      )}
    </TrackingScope>
  );
}
