import { useState } from 'react';
import { api } from '../../lib/api.js';
import { clearCache } from '../../lib/useFetch.js';
import { sized } from '../../lib/image.js';
import { slugify, STATUS_LABEL } from '../../lib/format.js';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import {
  PageHeader, Loading, LoadError, AdminModal, StatusPill, TextInput, TextArea, SelectInput, Toggle, MoveButtons, swap,
  useAdminData, useAction, useConfirm, useLookups, toLocalInput, fromLocalInput,
} from '../components/ui.jsx';
import { ImageField } from '../components/MediaPicker.jsx';
import { SeoFields, PinterestFields } from '../components/MetaFields.jsx';
import { CategorySelect, GuideSelect } from '../components/Pickers.jsx';

const EMPTY = {
  title: '', slug: '', keyword: '', description: '', image_url: '', category_id: null, source: '', trend_status: 'trending',
  trend_start: null, trend_end: null, priority: 50, active: true, linked_guide_id: null, linked_category_id: null, linked_url: '', seo: {}, pinterest: null,
};

function windowLabel(t) {
  if (!t.active) return 'inactive';
  if (t.is_current) return 'active';
  if (t.trend_start && new Date(t.trend_start) > new Date()) return 'scheduled';
  return 'archived';
}

export default function Trends() {
  const { data, error, loading, reload } = useAdminData('/admin/trends');
  const lookups = useLookups();
  const [editing, setEditing] = useState(null);
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const refresh = () => { reload(); lookups.reload(); clearCache('/'); };

  const open = async (t) => {
    const { data: full } = await api.get(`/admin/trends/${t.id}`);
    setEditing({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, full[k] ?? EMPTY[k]])), id: full.id,
      pinterest: full.pinterest ? { title: full.pinterest.title, description: full.pinterest.description, image_url: full.pinterest.image_url, destination_url: full.pinterest.destination_url, board: full.pinterest.board, status: full.pinterest.status } : null });
  };

  const save = async () => {
    const { id, ...body } = editing;
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => k in EMPTY));
    if (!payload.slug) delete payload.slug;
    await run(() => (id ? api.put(`/admin/trends/${id}`, payload) : api.post('/admin/trends', payload)), 'Trend saved');
    setEditing(null);
    refresh();
  };

  const set = (k) => (v) => setEditing((e) => ({ ...e, [k]: v }));

  return (
    <>
      <PageHeader title="Trends" subtitle="What people are searching for on Pinterest and Google right now. Only active trends inside their schedule window appear on the site. Order here is display order."
        actions={<Button size="sm" icon="plus" onClick={() => setEditing({ ...EMPTY })}>New trend</Button>} />
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <ul className="divide-y divide-line rounded-sm border border-line bg-card">
          {(data || []).map((t, i, list) => (
            <li key={t.id} className="flex items-center gap-3 px-3 py-2.5">
              <MoveButtons index={i} length={list.length} onMove={async (a, b) => {
                await run(() => api.post('/admin/trends/reorder', { ids: swap(list, a, b).map((x) => x.id) }));
                refresh();
              }} />
              {t.image_url ? <img src={sized(t.image_url, 80)} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="h-10 w-10 rounded-full bg-paper-2" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.title} <span className="ml-1 font-mono text-[0.68rem] text-muted uppercase">{STATUS_LABEL[t.trend_status]}</span></p>
                <p className="truncate font-mono text-[0.7rem] text-muted">→ {t.href}{t.trend_end ? ` · ends ${new Date(t.trend_end).toLocaleDateString()}` : ''}{t.trend_start && new Date(t.trend_start) > new Date() ? ` · starts ${new Date(t.trend_start).toLocaleDateString()}` : ''}</p>
              </div>
              <span className="font-mono text-[0.72rem] text-muted" title="Priority">P{t.priority}</span>
              <StatusPill status={windowLabel(t)} />
              <button onClick={() => open(t)} className="p-1 text-faint hover:text-ink" aria-label={`Edit ${t.title}`}><Icon name="edit" size={15} /></button>
              <button onClick={async () => {
                if (!(await confirm({ title: `Delete “${t.title}”?`, message: 'Past click stats for this trend are kept.' }))) return;
                await run(() => api.delete(`/admin/trends/${t.id}`), 'Trend deleted');
                refresh();
              }} className="p-1 text-faint hover:text-accent-ink" aria-label={`Delete ${t.title}`}><Icon name="trash" size={15} /></button>
            </li>
          ))}
          {data && !data.length && <li className="p-8 text-center text-sm text-muted">No trends yet.</li>}
        </ul>
      )}

      <AdminModal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? `Edit trend` : 'New trend'} wide
        footer={<><Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" loading={busy} onClick={save}>Save trend</Button></>}>
        {editing && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid content-start gap-4">
              <TextInput label="Title" value={editing.title} onChange={(v) => setEditing((e) => ({ ...e, title: v, ...(!e.id && !e._slug ? { slug: slugify(v) } : {}) }))} />
              <TextInput label="URL slug" value={editing.slug} onChange={(v) => setEditing((e) => ({ ...e, slug: slugify(v), _slug: true }))} hint={`/trending/${editing.slug || '…'}`} />
              <TextInput label="Search keyword" value={editing.keyword} onChange={set('keyword')} placeholder="e.g. halloween nail ideas" />
              <TextArea label="Description" value={editing.description} onChange={set('description')} rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <SelectInput label="Trend status" value={editing.trend_status} onChange={set('trend_status')} options={Object.entries(STATUS_LABEL).map(([value, label]) => ({ value, label }))} />
                <TextInput label="Priority (0–100)" type="number" min="0" max="100" value={editing.priority} onChange={(v) => set('priority')(Number(v))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Starts" type="datetime-local" value={toLocalInput(editing.trend_start)} onChange={(v) => set('trend_start')(fromLocalInput(v))} hint="Blank = now" />
                <TextInput label="Ends" type="datetime-local" value={toLocalInput(editing.trend_end)} onChange={(v) => set('trend_end')(fromLocalInput(v))} hint="Blank = no end" />
              </div>
              <TextInput label="Source" value={editing.source} onChange={set('source')} placeholder="Pinterest Trends, Oct 2026" />
              <ImageField label="Image" value={editing.image_url} onChange={set('image_url')} aspect="1" />
              <Toggle label="Active" checked={editing.active} onChange={set('active')} />
            </div>
            <div className="grid content-start gap-4">
              <div className="rounded-sm border border-line bg-card p-4">
                <p className="label">Where it links</p>
                <p className="mb-3 text-[0.75rem] text-muted">First set wins: URL, then guide, then category, else its own trend page.</p>
                <div className="grid gap-3">
                  <TextInput label="Custom URL" value={editing.linked_url} onChange={set('linked_url')} placeholder="/seasonal/halloween" />
                  <GuideSelect label="Linked guide" value={editing.linked_guide_id} onChange={set('linked_guide_id')} />
                  <CategorySelect label="Linked category" value={editing.linked_category_id} onChange={set('linked_category_id')} />
                  <CategorySelect label="Topic category" hint="Used to show the trend on that category's page." value={editing.category_id} onChange={set('category_id')} />
                </div>
              </div>
              <SeoFields value={editing.seo} onChange={set('seo')} fallbackTitle={editing.title} fallbackDescription={editing.description} path={`/trending/${editing.slug}`} />
              <PinterestFields value={editing.pinterest} onChange={set('pinterest')} fallbackTitle={editing.title} fallbackImage={editing.image_url} url={`${window.location.origin}/trending/${editing.slug}`} />
            </div>
          </div>
        )}
      </AdminModal>
    </>
  );
}
