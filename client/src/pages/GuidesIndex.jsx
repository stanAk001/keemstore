import { useSearchParams } from 'react-router-dom';
import { useFetch } from '../lib/useFetch.js';
import { usePageView } from '../lib/hooks.js';
import { Seo } from '../lib/seo.jsx';
import { useSite } from '../context/SiteContext.jsx';
import GuideCard from '../components/cards/GuideCard.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { EmptyState, ErrorState, CardGridSkeleton } from '../components/ui/States.jsx';

export default function GuidesIndex() {
  const site = useSite();
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || '';
  const page = Number(params.get('page')) || 1;
  const q = new URLSearchParams({ limit: '13', page: String(page), sort: 'latest', ...(category ? { category } : {}) });
  const { data, error, loading, reload } = useFetch(`/guides?${q}`);
  usePageView({ ready: Boolean(data) });

  const set = (patch) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    setParams(next);
  };
  const [lead, ...rest] = data?.items || [];

  return (
    <>
      <Seo title="Buying guides" description="Research-backed buying guides with honest notes on who each product is for — and who should skip it." path="/guides" />
      <header className="container-x pt-6 md:pt-16">
        <p className="eyebrow">The guides</p>
        <h1 className="mt-4 max-w-4xl font-serif text-[clamp(3rem,1.6rem+6vw,6.5rem)] leading-[0.9] tracking-[-0.025em]">
          Before you buy, <em className="text-accent">read this.</em>
        </h1>
        <p className="mt-6 max-w-xl text-[1rem] leading-relaxed text-ink-2 sm:text-[1.1rem]">
          Every guide explains who each pick is for, who should skip it, and what to check before buying.
        </p>
        <nav className="-mx-4 mt-6 flex gap-2 overflow-x-auto border-b border-line px-4 pb-5 no-scrollbar sm:mx-0 sm:mt-10 sm:flex-wrap sm:px-0 sm:pb-6" aria-label="Filter guides by category">
          <button onClick={() => set({ category: '', page: '' })} className={`shrink-0 rounded-full border px-4 py-1.5 text-[0.88rem] whitespace-nowrap ${!category ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink'}`}>All</button>
          {(site?.categories || []).map((c) => (
            <button key={c.id} onClick={() => set({ category: String(c.id), page: '' })}
              className={`shrink-0 rounded-full border px-4 py-1.5 text-[0.88rem] whitespace-nowrap ${category === String(c.id) ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink'}`}>
              {c.name}
            </button>
          ))}
        </nav>
      </header>

      <section className="container-x mt-12">
        {error && !data ? (
          <ErrorState error={error} onRetry={reload} />
        ) : loading && !data ? (
          <CardGridSkeleton count={6} aspect="aspect-[3/2]" />
        ) : !lead ? (
          <EmptyState title="No guides in this category yet" body="New guides are published regularly. Try another category in the meantime." action={{ url: '/guides', label: 'See all guides' }} />
        ) : (
          <>
            {page === 1 ? (
              <div className="grid gap-12 lg:grid-cols-12">
                <div className="lg:col-span-7"><GuideCard guide={lead} variant="lead" priority /></div>
                <div className="lg:col-span-5">{rest.slice(0, 4).map((g) => <GuideCard key={g.id} guide={g} variant="row" />)}</div>
              </div>
            ) : null}
            <div className="mt-16 grid gap-x-6 gap-y-4 sm:gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
              {(page === 1 ? rest.slice(4) : data.items).map((g) => <GuideCard key={g.id} guide={g} />)}
            </div>
            <Pagination page={data.page} pages={data.pages} onChange={(n) => { set({ page: n > 1 ? String(n) : '' }); window.scrollTo({ top: 0 }); }} />
          </>
        )}
      </section>
    </>
  );
}
