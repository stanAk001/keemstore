import { useState } from 'react';
import { api } from '../../lib/api.js';
import { clearCache } from '../../lib/useFetch.js';
import { slugify } from '../../lib/format.js';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { PageHeader, Loading, LoadError, AdminModal, AdminTable, StatusPill, TextInput, TextArea, Toggle, useAdminData, useAction, useConfirm, useLookups } from '../components/ui.jsx';
import { ImageField } from '../components/MediaPicker.jsx';
import { SeoFields, PinterestFields } from '../components/MetaFields.jsx';
import { ProductMultiPicker } from '../components/Pickers.jsx';

const EMPTY = { title: '', slug: '', description: '', image_url: '', seo: {}, featured: false, active: true, product_ids: [], pinterest: null };

export default function Collections() {
  const { data, error, loading, reload } = useAdminData('/admin/collections');
  const lookups = useLookups();
  const [editing, setEditing] = useState(null);
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const set = (k) => (v) => setEditing((e) => ({ ...e, [k]: v }));

  const open = async (c) => {
    const { data: full } = await api.get(`/admin/collections/${c.id}`);
    setEditing({ ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, full[k] ?? EMPTY[k]])), id: full.id,
      pinterest: full.pinterest ? { title: full.pinterest.title, description: full.pinterest.description, image_url: full.pinterest.image_url, destination_url: full.pinterest.destination_url, board: full.pinterest.board, status: full.pinterest.status } : null });
  };

  const save = async () => {
    const { id, ...body } = editing;
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => k in EMPTY));
    if (!payload.slug) delete payload.slug;
    await run(() => (id ? api.put(`/admin/collections/${id}`, payload) : api.post('/admin/collections', payload)), 'Collection saved');
    setEditing(null);
    reload();
    lookups.reload();
    clearCache('/');
  };

  return (
    <>
      <PageHeader title="Collections" subtitle="Hand-picked product lists with their own page (/collections/under-25). Use them in homepage sections too."
        actions={<Button size="sm" icon="plus" onClick={() => setEditing({ ...EMPTY })}>New collection</Button>} />
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <AdminTable rows={data} onRowClick={open} empty="No collections yet." columns={[
          { key: 'title', label: 'Collection', render: (c) => <div><p className="font-medium">{c.title}</p><p className="font-mono text-[0.7rem] text-muted">/collections/{c.slug}</p></div> },
          { key: 'product_count', label: 'Products', className: 'font-mono' },
          { key: 'status', label: 'Status', render: (c) => <span className="flex gap-1"><StatusPill status={c.active ? 'active' : 'inactive'} />{c.featured && <StatusPill status="ready" />}</span> },
          { key: 'actions', label: '', render: (c) => (
            <button onClick={async (e) => {
              e.stopPropagation();
              if (!(await confirm({ title: `Delete “${c.title}”?`, message: 'Products are not deleted.' }))) return;
              await run(() => api.delete(`/admin/collections/${c.id}`), 'Collection deleted');
              reload();
              lookups.reload();
            }} className="p-1 text-faint hover:text-accent-ink" aria-label="Delete"><Icon name="trash" size={15} /></button>
          ) },
        ]} />
      )}
      <AdminModal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Edit collection' : 'New collection'} wide
        footer={<><Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" loading={busy} onClick={save}>Save</Button></>}>
        {editing && (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="grid content-start gap-4">
              <TextInput label="Title" value={editing.title} onChange={(v) => setEditing((e) => ({ ...e, title: v, ...(!e.id && !e._slug ? { slug: slugify(v) } : {}) }))} />
              <TextInput label="URL slug" value={editing.slug} onChange={(v) => setEditing((e) => ({ ...e, slug: slugify(v), _slug: true }))} />
              <TextArea label="Description" value={editing.description} onChange={set('description')} rows={2} />
              <ImageField label="Image" value={editing.image_url} onChange={set('image_url')} />
              <Toggle label="Active" checked={editing.active} onChange={set('active')} />
              <Toggle label="Featured" checked={editing.featured} onChange={set('featured')} />
              <ProductMultiPicker value={editing.product_ids} onChange={set('product_ids')} />
            </div>
            <div className="grid content-start gap-4">
              <SeoFields value={editing.seo} onChange={set('seo')} fallbackTitle={editing.title} fallbackDescription={editing.description} path={`/collections/${editing.slug}`} />
              <PinterestFields value={editing.pinterest} onChange={set('pinterest')} fallbackTitle={editing.title} url={`${window.location.origin}/collections/${editing.slug}`} />
            </div>
          </div>
        )}
      </AdminModal>
    </>
  );
}
