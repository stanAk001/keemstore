import { useState } from 'react';
import { api } from '../../lib/api.js';
import { clearCache } from '../../lib/useFetch.js';
import { slugify } from '../../lib/format.js';
import Button from '../../components/ui/Button.jsx';
import { PageHeader, Loading, LoadError, AdminModal, AdminTable, StatusPill, TextInput, TextArea, Toggle, useAdminData, useAction, useConfirm } from '../components/ui.jsx';
import { SeoFields } from '../components/MetaFields.jsx';
import BlockEditor, { withBlockIds } from '../components/BlockEditor.jsx';

const EMPTY = { title: '', slug: '', summary: '', content: [], seo: {}, active: true };
const BUILT_IN = ['about', 'contact', 'affiliate-disclosure', 'editorial-policy', 'privacy', 'terms'];

export default function Pages() {
  const { data, error, loading, reload } = useAdminData('/admin/pages');
  const [editing, setEditing] = useState(null);
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const set = (k) => (v) => setEditing((e) => ({ ...e, [k]: v }));

  const open = async (p) => {
    const { data: full } = await api.get(`/admin/pages/${p.id}`);
    setEditing({ ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, full[k] ?? EMPTY[k]])), content: withBlockIds(full.content), id: full.id });
  };
  const save = async () => {
    const { id, ...body } = editing;
    const payload = Object.fromEntries(Object.entries(body).filter(([k]) => k in EMPTY));
    if (!payload.slug) delete payload.slug;
    await run(() => (id ? api.put(`/admin/pages/${id}`, payload) : api.post('/admin/pages', payload)), 'Page saved');
    clearCache('/pages');
    setEditing(null);
    reload();
  };

  return (
    <>
      <PageHeader title="Pages" subtitle={`About, disclosure, privacy and other standing pages. These URLs are wired into the site: ${BUILT_IN.map((s) => `/${s}`).join(', ')}.`}
        actions={<Button size="sm" icon="plus" onClick={() => setEditing({ ...EMPTY })}>New page</Button>} />
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <AdminTable rows={data} onRowClick={open} columns={[
          { key: 'title', label: 'Page', render: (p) => <div><p className="font-medium">{p.title}</p><p className="font-mono text-[0.7rem] text-muted">/{p.slug}{!BUILT_IN.includes(p.slug) && ' — not linked to a route'}</p></div> },
          { key: 'active', label: 'Status', render: (p) => <StatusPill status={p.active ? 'active' : 'inactive'} /> },
          { key: 'updated_at', label: 'Updated', render: (p) => new Date(p.updated_at).toLocaleDateString() },
          { key: 'x', label: '', render: (p) => !BUILT_IN.includes(p.slug) && (
            <button className="text-[0.78rem] text-accent-ink underline" onClick={async (e) => {
              e.stopPropagation();
              if (!(await confirm({ title: `Delete “${p.title}”?` }))) return;
              await run(() => api.delete(`/admin/pages/${p.id}`), 'Page deleted');
              reload();
            }}>Delete</button>
          ) },
        ]} />
      )}
      <AdminModal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.title}` : 'New page'} wide
        footer={<><Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" loading={busy} onClick={save}>Save page</Button></>}>
        {editing && (
          <div className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Title" value={editing.title} onChange={(v) => setEditing((e) => ({ ...e, title: v, ...(!e.id ? { slug: slugify(v) } : {}) }))} />
              <TextInput label="URL slug" value={editing.slug} onChange={(v) => set('slug')(slugify(v))} hint={BUILT_IN.includes(editing.slug) ? 'Built-in page — changing the slug will unlink it.' : undefined} />
            </div>
            <TextArea label="Summary" value={editing.summary} onChange={set('summary')} rows={2} />
            <Toggle label="Active" checked={editing.active} onChange={set('active')} />
            <BlockEditor value={editing.content} onChange={set('content')} />
            <SeoFields value={editing.seo} onChange={set('seo')} fallbackTitle={editing.title} fallbackDescription={editing.summary} path={`/${editing.slug}`} />
          </div>
        )}
      </AdminModal>
    </>
  );
}
