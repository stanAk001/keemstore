import { useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { sized } from '../../lib/image.js';
import Button from '../../components/ui/Button.jsx';
import { PageHeader, Loading, LoadError, AdminModal, StatusPill, CopyButton, Tabs, useAdminData, useAction } from '../components/ui.jsx';
import { PinterestFields } from '../components/MetaFields.jsx';

const TYPE_LABEL = { guide: 'Guide', collection: 'Collection', trend: 'Trend', seasonal_page: 'Seasonal', category: 'Category' };

export default function Pinterest() {
  const { data, error, loading, reload } = useAdminData('/admin/pinterest');
  const [filter, setFilter] = useState('');
  const [editing, setEditing] = useState(null);
  const [run, busy] = useAction();

  const rows = useMemo(() => (data || []).filter((r) => {
    if (!filter) return true;
    if (filter === 'missing') return !r.pin_title;
    if (filter === 'ready') return r.pin_status === 'ready';
    return r.entity_type === filter;
  }), [data, filter]);

  const save = async () => {
    const { entity_type, entity_id, fields } = editing;
    await run(() => api.put('/admin/pinterest', { entity_type, entity_id, ...fields }), 'Pinterest details saved');
    setEditing(null);
    reload();
  };

  return (
    <>
      <PageHeader title="Pinterest" subtitle="Everything pinnable, with its pin title, description, image and URL ready to copy. Content without pin copy is flagged." />
      <Tabs value={filter} onChange={setFilter} tabs={[['', 'All'], ['missing', 'Missing pin copy'], ['ready', 'Ready to pin'], ['guide', 'Guides'], ['trend', 'Trends'], ['collection', 'Collections'], ['seasonal_page', 'Seasonal'], ['category', 'Categories']]} />
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <div className="grid gap-3">
          {rows.map((r) => {
            const title = r.pin_title || r.title;
            const image = r.pin_image || r.image;
            return (
              <article key={`${r.entity_type}-${r.entity_id}`} className="grid gap-4 rounded-sm border border-line bg-card p-3 sm:grid-cols-[72px_1fr_auto]">
                <div className="aspect-[2/3] w-[72px] overflow-hidden bg-paper-2">{image && <img src={sized(image, 150)} alt="" className="h-full w-full object-cover" />}</div>
                <div className="min-w-0">
                  <p className="font-mono text-[0.66rem] tracking-wider text-muted uppercase">{TYPE_LABEL[r.entity_type]}{r.category ? ` · ${r.category}` : ''} · <StatusPill status={r.status} /></p>
                  <p className="mt-1 font-medium">{r.title}</p>
                  <dl className="mt-2 grid gap-1.5 text-[0.8rem]">
                    <div className="flex items-start gap-2"><dt className="w-20 shrink-0 text-muted">Pin title</dt><dd className={`min-w-0 flex-1 ${r.pin_title ? '' : 'text-accent-ink'}`}>{r.pin_title || `Not set (uses “${r.title}”)`}</dd><CopyButton text={title} /></div>
                    <div className="flex items-start gap-2"><dt className="w-20 shrink-0 text-muted">Description</dt><dd className={`line-clamp-2 min-w-0 flex-1 ${r.pin_description ? '' : 'text-accent-ink'}`}>{r.pin_description || 'Not set'}</dd><CopyButton text={r.pin_description} /></div>
                    <div className="flex items-start gap-2"><dt className="w-20 shrink-0 text-muted">URL</dt><dd className="min-w-0 flex-1 truncate font-mono text-[0.72rem]">{r.pin_destination}</dd><CopyButton text={r.pin_destination} /></div>
                  </dl>
                </div>
                <div className="flex flex-row items-start gap-2 sm:flex-col sm:items-end">
                  {r.pin_status ? <StatusPill status={r.pin_status} /> : <StatusPill status="missing" />}
                  {image && <a href={image} target="_blank" rel="noreferrer" className="text-[0.75rem] underline">Open image</a>}
                  <Button size="sm" variant="outline" onClick={() => setEditing({
                    entity_type: r.entity_type, entity_id: r.entity_id, title: r.title, url: r.url, image: r.image,
                    fields: { title: r.pin_title, description: r.pin_description, image_url: r.pin_image, destination_url: r.pin_destination === r.url ? '' : r.pin_destination, board: r.pin_board, status: r.pin_status || 'draft' },
                  })}>Edit</Button>
                </div>
              </article>
            );
          })}
          {!rows.length && <p className="p-8 text-center text-sm text-muted">Nothing in this view.</p>}
        </div>
      )}
      <AdminModal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.title || ''}
        footer={<><Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" loading={busy} onClick={save}>Save</Button></>}>
        {editing && <PinterestFields value={editing.fields} onChange={(f) => setEditing((e) => ({ ...e, fields: f }))} fallbackTitle={editing.title} fallbackImage={editing.image} url={editing.url} />}
      </AdminModal>
    </>
  );
}
