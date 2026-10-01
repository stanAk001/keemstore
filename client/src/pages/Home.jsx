import { useFetch } from '../lib/useFetch.js';
import { usePageView } from '../lib/hooks.js';
import { Seo } from '../lib/seo.jsx';
import { useSite } from '../context/SiteContext.jsx';
import SectionRenderer from '../components/sections/Sections.jsx';
import { ErrorState, Skeleton, CardGridSkeleton } from '../components/ui/States.jsx';

function HomeSkeleton() {
  return (
    <div className="container-x grid gap-10 pt-12 pb-20 lg:grid-cols-12" aria-busy="true" aria-label="Loading">
      <div className="flex flex-col justify-end lg:col-span-5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="mt-6 h-24 w-full" />
        <Skeleton className="mt-3 h-24 w-4/5" />
        <Skeleton className="mt-8 h-12 w-64" />
      </div>
      <Skeleton className="h-[420px] lg:col-span-7 lg:h-[600px]" />
      <div className="lg:col-span-12"><CardGridSkeleton count={4} /></div>
    </div>
  );
}

export default function Home() {
  const site = useSite();
  const { data, error, loading, reload } = useFetch('/homepage');
  usePageView({ entityType: 'home', ready: Boolean(data) });

  const siteUrl = site?.site?.url || window.location.origin;
  const jsonLd = [
    { '@context': 'https://schema.org', '@type': 'WebSite', name: site?.site?.name, url: siteUrl,
      potentialAction: { '@type': 'SearchAction', target: `${siteUrl}/search?q={query}`, 'query-input': 'required name=query' } },
    { '@context': 'https://schema.org', '@type': 'Organization', name: site?.site?.name, url: siteUrl },
  ];

  return (
    <>
      <Seo title={null} description={site?.site?.description} path="/" jsonLd={jsonLd} />
      {loading && !data && <HomeSkeleton />}
      {error && !data && (
        <div className="container-x py-20"><ErrorState error={error} onRetry={reload} title="The homepage didn't load" /></div>
      )}
      {data && <SectionRenderer sections={data.sections} />}
    </>
  );
}
