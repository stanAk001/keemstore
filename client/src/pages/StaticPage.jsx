import { useLocation } from 'react-router-dom';
import { useFetch } from '../lib/useFetch.js';
import { usePageView } from '../lib/hooks.js';
import { Seo } from '../lib/seo.jsx';
import { formatDate } from '../lib/format.js';
import { useSite } from '../context/SiteContext.jsx';
import BlockRenderer from '../components/guide/BlockRenderer.jsx';
import { ErrorState, PageSkeleton } from '../components/ui/States.jsx';
import NotFound from './NotFound.jsx';

export default function StaticPage() {
  const slug = useLocation().pathname.replace(/^\/|\/$/g, '');
  const site = useSite();
  const { data: page, error, loading, reload } = useFetch(`/pages/${slug}`);
  usePageView({ ready: Boolean(page) });

  if (loading && !page) return <PageSkeleton />;
  if (error?.response?.status === 404) return <NotFound />;
  if (error) return <div className="container-x py-20"><ErrorState error={error} onRetry={reload} /></div>;
  if (!page) return null;

  return (
    <>
      <Seo title={page.title} description={page.summary} seo={page.seo} path={`/${page.slug}`} />
      <article className="container-x pt-10 md:pt-16">
        <div className="mx-auto max-w-2xl">
          <p className="eyebrow">{site?.site?.name}</p>
          <h1 className="mt-4 font-serif text-[clamp(2.8rem,1.6rem+4vw,5rem)] leading-[0.95] tracking-[-0.02em]">{page.title}</h1>
          {page.summary && <p className="mt-5 font-serif text-[1.45rem] leading-snug text-ink-2 italic">{page.summary}</p>}
          <p className="eyebrow mt-6 border-b border-line pb-6">Last updated {formatDate(page.updated_at)}</p>
          <div className="prose-editorial mt-4">
            <BlockRenderer blocks={page.content} />
          </div>
          {slug === 'contact' && site?.site?.contact_email && (
            <p className="mt-8 font-serif text-[1.6rem]">
              <a href={`mailto:${site.site.contact_email}`} className="underline decoration-accent underline-offset-4">{site.site.contact_email}</a>
            </p>
          )}
        </div>
      </article>
    </>
  );
}
