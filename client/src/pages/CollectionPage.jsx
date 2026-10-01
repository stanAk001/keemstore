import { useParams } from 'react-router-dom';
import { useFetch } from '../lib/useFetch.js';
import { usePageView } from '../lib/hooks.js';
import { Seo, breadcrumbLd, itemListLd } from '../lib/seo.jsx';
import { useSite } from '../context/SiteContext.jsx';
import Breadcrumbs from '../components/ui/Breadcrumbs.jsx';
import ProductCard from '../components/product/ProductCard.jsx';
import { EmptyState, ErrorState, PageSkeleton } from '../components/ui/States.jsx';
import NotFound from './NotFound.jsx';

export default function CollectionPage() {
  const { slug } = useParams();
  const site = useSite();
  const { data: c, error, loading, reload } = useFetch(`/collections/${slug}`);
  usePageView({ entityType: 'collection', entityId: c?.id, ready: Boolean(c) });

  if (loading && !c) return <PageSkeleton />;
  if (error?.response?.status === 404) return <NotFound />;
  if (error) return <div className="container-x py-20"><ErrorState error={error} onRetry={reload} /></div>;
  if (!c) return null;
  const siteUrl = site?.site?.url || window.location.origin;
  const crumbs = [{ label: 'Home', to: '/' }, { label: 'Collections' }, { label: c.title, to: `/collections/${c.slug}` }];

  return (
    <>
      <Seo title={c.title} description={c.description} seo={c.seo} image={c.image_url} path={`/collections/${c.slug}`}
        jsonLd={[breadcrumbLd(crumbs, siteUrl), itemListLd(c.title, c.products, siteUrl)]} />
      <header className="container-x pt-5 md:pt-12">
        <Breadcrumbs items={crumbs} />
        <p className="eyebrow mt-6 sm:mt-10">Collection · {c.products.length} finds</p>
        <h1 className="mt-3 font-serif text-[clamp(3rem,1.6rem+6vw,6.5rem)] leading-[0.9] tracking-[-0.025em]">{c.title}</h1>
        {c.description && <p className="mt-5 max-w-xl text-[1rem] leading-relaxed text-ink-2 sm:text-[1.15rem]">{c.description}</p>}
      </header>
      <section className="container-x mt-8 border-t border-line pt-6 sm:mt-12 sm:pt-10">
        {c.products.length ? (
          <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-12 md:grid-cols-3 md:gap-x-6 lg:grid-cols-4">
            {c.products.map((p, i) => <ProductCard key={p.id} product={p} cta="collection" priority={i < 4} />)}
          </div>
        ) : (
          <EmptyState title="This collection is empty" body="Products will appear here once they're added." action={{ url: '/', label: 'Back to the homepage' }} />
        )}
      </section>
    </>
  );
}
