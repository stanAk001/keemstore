import { useState } from 'react';
import { api } from '../../lib/api.js';
import { clearCache } from '../../lib/useFetch.js';
import { sized } from '../../lib/image.js';
import { isVideo, posterFor } from '../../lib/media.js';
import { slugify } from '../../lib/format.js';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import {
  PageHeader, Loading, LoadError, AdminModal, StatusPill, TextInput, TextArea, Toggle, MoveButtons, swap,
  useAdminData, useAction, useConfirm, useLookups,
} from '../components/ui.jsx';
import { ImageField } from '../components/MediaPicker.jsx';
import { SeoFields } from '../components/MetaFields.jsx';
import { CategorySelect } from '../components/Pickers.jsx';

const EMPTY = { name: '', slug: '', parent_id: null, description: '', intro: '', image_url: '', image_alt: '', seo: {}, featured: false, active: true };

export default function Categories() {
  const { data, error, loading, reload } = useAdminData('/admin/categories');
  const lookups = useLookups();
  const [editing, setEditing] = useState(null);
  const [run, busy] = useAction();
  const confirm = useConfirm();

  const refresh = () => { reload(); lookups.reload(); clearCache('/'); };
  const top = (data || []).filter((c) => !c.parent_id);
  const childrenOf = (id) => (data || []).filter((c) => c.parent_id === id);

  const reorder = async (list, a, b) => {
    const ids = swap(list, a, b).map((c) => c.id);
    await run(() => api.post('/admin/categories/reorder', { ids }), 'Order saved');
    refresh();
  };

  const save = async () => {
    const { id, ...body } = editing;
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => k in EMPTY));
    if (!payload.slug) delete payload.slug;
    await run(() => (id ? api.put(`/admin/categories/${id}`, payload) : api.post('/admin/categories', payload)), 'Category saved');
    setEditing(null);
    refresh();
  };

  const remove = async (c) => {
    if (!(await confirm({ title: `Delete “${c.name}”?`, message: 'Products and guides in it stay, but lose this category. Subcategories become top-level. Deactivating is usually safer.' }))) return;
    await run(() => api.delete(`/admin/categories/${c.id}`), 'Category deleted');
    refresh();
  };

  const Row = ({ c, list, index, child }) => (
    <li className={`flex items-center gap-3 px-3 py-2.5 ${child ? 'pl-12' : ''}`}>
      <MoveButtons index={index} length={list.length} onMove={(a, b) => reorder(list, a, b)} />
      {c.image_url ? <img src={isVideo(c.image_url) ? posterFor(c.image_url, 160) : sized(c.image_url, 80)}alt="" className="h-9 w-9 object-cover" /> : <span className="h-9 w-9 bg-paper-2" />}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{c.name} {c.featured && <span className="ml-1 font-mono text-[0.68rem] text-accent-ink">★ featured</span>}</p>
        <p className="font-mono text-[0.7rem] text-muted">{c.path} · {c.product_count} products</p>
      </div>
      {!c.active && <StatusPill status="inactive" />}
      <a href={c.path} target="_blank" rel="noreferrer" className="p-1 text-faint hover:text-ink" aria-label="View on site"><Icon name="external" size={15} /></a>
      <button onClick={() => setEditing({ ...EMPTY, ...c, seo: c.seo || {} })} className="p-1 text-faint hover:text-ink" aria-label={`Edit ${c.name}`}><Icon name="edit" size={15} /></button>
      <button onClick={() => remove(c)} className="p-1 text-faint hover:text-accent-ink" aria-label={`Delete ${c.name}`}><Icon name="trash" size={15} /></button>
    </li>
  );

  return (
    <>
      <PageHeader title="Categories" subtitle="Top-level categories get their own URL (/gadgets); subcategories nest under them (/gadgets/smart-home). Order here is the order on the site."
        actions={<Button size="sm" icon="plus" onClick={() => setEditing({ ...EMPTY })}>New category</Button>} />
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <ul className="divide-y divide-line rounded-sm border border-line bg-card">
          {top.map((c, i) => (
            <li key={c.id}>
              <ul><Row c={c} list={top} index={i} /></ul>
              {childrenOf(c.id).length > 0 && (
                <ul className="border-t border-dashed border-line bg-paper/50">
                  {childrenOf(c.id).map((k, j, arr) => <Row key={k.id} c={k} list={arr} index={j} child />)}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}

      <AdminModal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.name}` : 'New category'} wide
        footer={<><Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" loading={busy} onClick={save}>Save category</Button></>}>
        {editing && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid content-start gap-4">
              <TextInput label="Name" value={editing.name} onChange={(v) => setEditing((e) => ({ ...e, name: v, ...(!e.id && !e._slug ? { slug: slugify(v) } : {}) }))} />
              <TextInput label="URL slug" value={editing.slug} onChange={(v) => setEditing((e) => ({ ...e, slug: slugify(v), _slug: true }))} />
              <CategorySelect label="Parent" topOnly placeholder="— Top level —" value={editing.parent_id} onChange={(v) => setEditing((e) => ({ ...e, parent_id: v }))} />
              <TextArea label="Description" value={editing.description} onChange={(v) => setEditing((e) => ({ ...e, description: v }))} rows={2} counter={200} />
              <TextArea label="Intro" hint="A longer paragraph shown on the category page." value={editing.intro} onChange={(v) => setEditing((e) => ({ ...e, intro: v }))} rows={3} />
              <ImageField label="Image" value={editing.image_url} onChange={(v) => setEditing((e) => ({ ...e, image_url: v }))} alt={editing.image_alt} onAltChange={(v) => setEditing((e) => ({ ...e, image_alt: v }))} />
              <Toggle label="Active" checked={editing.active} onChange={(v) => setEditing((e) => ({ ...e, active: v }))} />
              <Toggle label="Featured" hint="Shown in featured category sections." checked={editing.featured} onChange={(v) => setEditing((e) => ({ ...e, featured: v }))} />
            </div>
            <SeoFields value={editing.seo} onChange={(v) => setEditing((e) => ({ ...e, seo: v }))} fallbackTitle={editing.name} fallbackDescription={editing.description} path={editing.path || `/${editing.slug}`} />
          </div>
        )}
      </AdminModal>
    </>
  );
}
