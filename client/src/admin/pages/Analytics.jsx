import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, Panel, Loading, LoadError, AdminTable, StatusPill, useAdminData } from '../components/ui.jsx';
import { TimeChart, BarList, StatTile } from '../components/Charts.jsx';

const RANGES = [['today', 'Today'], ['7d', '7 days'], ['30d', '30 days'], ['90d', '90 days']];

function RangePicker({ value, onChange }) {
  return (
    <div className="flex rounded-sm border border-line-strong bg-card p-0.5" role="radiogroup" aria-label="Date range">
      {RANGES.map(([k, label]) => (
        <button key={k} role="radio" aria-checked={value === k} onClick={() => onChange(k)}
          className={`rounded-xs px-3 py-1 text-[0.8rem] ${value === k ? 'bg-ink text-paper' : 'text-ink-2 hover:bg-paper-2'}`}>{label}</button>
      ))}
    </div>
  );
}

export function Clicks() {
  const [range, setRange] = useState('30d');
  const { data, error, loading, reload } = useAdminData(`/admin/analytics/clicks?range=${range}`);
  const recent = useAdminData('/admin/analytics/recent');
  return (
    <>
      <PageHeader title="Affiliate clicks" subtitle="Outbound clicks on retailer links, recorded on this site. This is not the same as Amazon orders." actions={<RangePicker value={range} onChange={setRange} />} />
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <div className="grid gap-6">
          <div className="grid grid-cols-3 gap-3">
            <StatTile label="Clicks" value={data.totals.clicks.toLocaleString()} />
            <StatTile label="Sessions that clicked" value={data.totals.sessions.toLocaleString()} />
            <StatTile label="Products clicked" value={data.totals.products} />
          </div>
          <Panel title="Clicks over time"><TimeChart data={data.overTime} /></Panel>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            <Panel title="By product"><BarList rows={data.products} /></Panel>
            <Panel title="By guide"><BarList rows={data.guides} labelKey="title" /></Panel>
            <Panel title="By category"><BarList rows={data.categories} /></Panel>
            <Panel title="By CTA placement" description="Which button or position was clicked."><BarList rows={data.ctas} labelKey="cta" /></Panel>
            <Panel title="By traffic source"><BarList rows={data.sources} labelKey="source" /></Panel>
            <Panel title="By device"><BarList rows={data.devices} labelKey="device" /></Panel>
          </div>
          <Panel title="Latest clicks">
            <AdminTable rows={recent.data || []} empty="No clicks recorded yet." columns={[
              { key: 'created_at', label: 'When', render: (r) => new Date(r.created_at).toLocaleString() },
              { key: 'product_name', label: 'Product' },
              { key: 'guide_title', label: 'Guide', render: (r) => r.guide_title || '—' },
              { key: 'cta_location', label: 'CTA', render: (r) => <span className="font-mono text-[0.75rem]">{r.cta_location}</span> },
              { key: 'source', label: 'Source' },
              { key: 'device', label: 'Device' },
            ]} />
          </Panel>
        </div>
      )}
    </>
  );
}

export function ContentPerformance() {
  const [range, setRange] = useState('30d');
  const { data, error, loading, reload } = useAdminData(`/admin/analytics/content?range=${range}`);
  return (
    <>
      <PageHeader title="Content performance" subtitle="Which content actually makes people click products? Views are first-party page views; click rate = affiliate clicks ÷ views." actions={<RangePicker value={range} onChange={setRange} />} />
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data && <Loading />}
      {data && (
        <div className="grid gap-6">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="Page views" value={data.views.page_views.toLocaleString()} />
            <StatTile label="Sessions" value={data.views.sessions.toLocaleString()} />
          </div>
          <Panel title="Guides">
            <AdminTable rows={data.guides} empty="No guide views or clicks in this range." columns={[
              { key: 'title', label: 'Guide', render: (g) => <Link to={`/admin/guides/${g.id}`} className="font-medium hover:underline">{g.title}</Link> },
              { key: 'status', label: 'Status', render: (g) => <StatusPill status={g.status} /> },
              { key: 'views', label: 'Views', className: 'text-right font-mono' },
              { key: 'clicks', label: 'Clicks', className: 'text-right font-mono' },
              { key: 'click_rate', label: 'Click rate', className: 'text-right font-mono', render: (g) => (g.click_rate == null ? '—' : `${g.click_rate}%`) },
            ]} />
          </Panel>
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
            <Panel title="Top searches"><BarList rows={data.searches} labelKey="query" valueKey="searches" empty="No searches yet." /></Panel>
            <Panel title="Top trends"><BarList rows={data.trends} labelKey="title" empty="No trend clicks yet." /></Panel>
            <Panel title="Top categories"><BarList rows={data.categories} empty="No category clicks yet." /></Panel>
            <Panel title="Traffic sources"><BarList rows={data.sources} labelKey="source" valueKey="views" empty="No page views yet." /></Panel>
          </div>
        </div>
      )}
    </>
  );
}
