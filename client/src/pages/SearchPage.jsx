import { Link, useSearchParams } from 'react-router-dom';
import { useFetch } from '../lib/useFetch.js';
import { usePageView } from '../lib/hooks.js';
import { Seo } from '../lib/seo.jsx';
import { useSite } from '../context/SiteContext.jsx';
import SearchBox from '../components/layout/SearchBox.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import GuideCard from '../components/cards/GuideCard.jsx';
import { TrendPill } from '../components/cards/TrendCard.jsx';
import { EmptyState, ErrorState, CardGridSkeleton } from '../components/ui/States.jsx';

const TABS = [
  ['', 'Everything'],
  ['guides', 'Guides'],
  ['products', 'Products'],
];

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const site = useSite();
  const q = params.get('q') || '';
  const type = params.get('type') || '';
  const category = params.get('category') || '';
  const query = new URLSearchParams({ q, ...(type ? { type } : {}), ...(category ? { category } : {}) });
  const { data, error, loading, reload } = useFetch(q ? `/search?${query}` : null, { cacheable: false });
  usePageView({ ready: Boolean(data) || !q });

  const set = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next);
  };

  return (
    <>
      <Seo title={q ? `Search: ${q}` : 'Search'} path="/search" noindex />
      <header className="container-x pt-6 md:pt-16">
        <p className="eyebrow mb-6">Search</p>
        <SearchBox key={q} initial={q} size="lg" />
        <div className="mt-6 flex flex-wrap items-center gap-2">
          {TABS.map(([value, label]) => (
            <button key={value} onClick={() => set({ type: value })}
              className={`rounded-full border px-4 py-1.5 text-[0.88rem] ${type === value ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink'}`}>
              {label}
            </button>
          ))}
          <label className="ml-auto">
            <span className="sr-only">Category</span>
            <select value={category} onChange={(e) => set({ category: e.target.value })} className="h-9 rounded-full border border-line-strong bg-card px-3.5 text-[0.85rem]">
              <option value="">All categories</option>
              {(site?.categories || []).flatMap((c) => [c, ...c.children.map((k) => ({ ...k, name: `— ${k.name}` }))]).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <div className="container-x mt-12">
        {!q && <EmptyState title="What are you shopping for?" body="Try “power outage”, “bedroom” or “gifts under $25”." />}
        {error && <ErrorState error={error} onRetry={reload} />}
        {loading && <CardGridSkeleton count={4} />}
        {data && !loading && (
          data.total === 0 ? (
            <EmptyState
              title={`Nothing for “${data.q}” yet`}
              body="Try a broader word, check the spelling, or browse what's trending right now."
              action={{ url: '/trending', label: 'See what’s trending' }}
            />
          ) : (
            <div className="space-y-20">
              <p className="font-mono text-sm text-muted">{data.total} results for “{data.q}”</p>
              {(data.categories.length > 0 || data.trends.length > 0) && (
                <div className="flex flex-wrap gap-2">
                  {data.categories.map((c) => (
                    <Link key={`c${c.id}`} to={c.path} className="rounded-full border border-ink px-4 py-1.5 text-[0.9rem] hover:bg-ink hover:text-paper">{c.name} →</Link>
                  ))}
                  {data.trends.map((t) => <TrendPill key={`t${t.id}`} trend={{ ...t, href: `/trending/${t.slug}` }} />)}
                </div>
              )}
              {data.guides.length > 0 && (
                <section>
                  <h2 className="mb-8 border-t border-ink pt-4 font-serif text-title">Guides</h2>
                  <div className="grid gap-x-6 gap-y-4 sm:gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{data.guides.map((g) => <GuideCard key={g.id} guide={g} />)}</div>
                </section>
              )}
              {data.products.length > 0 && (
                <section>
                  <h2 className="mb-8 border-t border-ink pt-4 font-serif text-title">Products</h2>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
                    {data.products.map((p) => <ProductCard key={p.id} product={p} cta="search" />)}
                  </div>
                </section>
              )}
            </div>
          )
        )}
      </div>
    </>
  );
}
