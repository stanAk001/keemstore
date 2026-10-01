import { Link } from 'react-router-dom';
import { PageHeader, Panel, Loading, LoadError, useAdminData } from '../components/ui.jsx';
import { TimeChart, BarList, StatTile } from '../components/Charts.jsx';
import { ButtonLink } from '../../components/ui/Button.jsx';

export default function Dashboard() {
  const { data, error, loading, reload } = useAdminData('/admin/dashboard');
  if (loading && !data) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;
  const { counts: c, clicks } = data;

  return (
    <>
      <PageHeader
        title="Dashboard"
        subtitle="Affiliate clicks are counted on this site. Amazon conversions and earnings are only available in your Associates account."
        actions={<>
          <ButtonLink to="/admin/guides/new" size="sm" icon="plus">New guide</ButtonLink>
          <ButtonLink to="/admin/products/new" size="sm" variant="outline" icon="plus">New product</ButtonLink>
        </>}
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-6">
        <StatTile label="Guides" value={c.guides} note={`${c.published_guides} published · ${c.draft_guides} draft${c.scheduled_guides ? ` · ${c.scheduled_guides} scheduled` : ''}`} />
        <StatTile label="Products" value={c.products} note={`${c.active_products} active`} />
        <StatTile label="Categories" value={c.categories} />
        <StatTile label="Active trends" value={c.trends} />
        <StatTile label="Clicks · 7 days" value={c.clicks_7d.toLocaleString()} note={`${c.clicks_all_time.toLocaleString()} all time`} />
        <StatTile label="Subscribers" value={c.subscribers} />
      </div>

      {c.products_missing_links > 0 && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-sm border-l-2 border-accent bg-accent-soft/50 px-4 py-3 text-sm">
          <span><strong>{c.products_missing_links}</strong> active product{c.products_missing_links === 1 ? ' has' : 's have'} no retailer link, so their buttons show “Link unavailable”.</span>
          <Link to="/admin/products?missing=1" className="font-medium underline">Review products</Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <Panel title="Affiliate clicks · last 30 days" className="xl:col-span-2" actions={<Link to="/admin/analytics/clicks" className="text-[0.8rem] underline">Details</Link>}>
          <TimeChart data={clicks.overTime} />
        </Panel>
        <Panel title="Top products"><BarList rows={clicks.products} /></Panel>
        <Panel title="Top guides"><BarList rows={clicks.guides} labelKey="title" empty="No guide clicks yet." /></Panel>
        <Panel title="Top categories"><BarList rows={clicks.categories} empty="No category clicks yet." /></Panel>
        <Panel title="Traffic source of clicks" description="Where visitors arrived from before clicking out."><BarList rows={clicks.sources} labelKey="source" empty="No clicks yet." /></Panel>
      </div>
    </>
  );
}
