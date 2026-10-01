import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { clearCache } from '../../lib/useFetch.js';
import { sized } from '../../lib/image.js';
import { slugify } from '../../lib/format.js';
import Button, { ButtonLink } from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import {
  PageHeader, Panel, Loading, LoadError, AdminTable, StatusPill, Tabs, TextInput, TextArea, SelectInput, Toggle, ListInput,
  MoveButtons, swap, useAdminData, useAction, useConfirm, useLookups, toLocalInput, fromLocalInput,
} from '../components/ui.jsx';
import BlockEditor, { FaqEditor, withBlockIds } from '../components/BlockEditor.jsx';
import { ImageField } from '../components/MediaPicker.jsx';
import { MOTION_SCENES } from '../../components/motion/index.jsx';
import { SeoFields, PinterestFields } from '../components/MetaFields.jsx';
import { CategorySelect, CategoryMultiPicker, GuideMultiPicker } from '../components/Pickers.jsx';

// ===========================================================================
export function GuidesList() {
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useAdminData(`/admin/guides?limit=200${status ? `&status=${status}` : ''}${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  const navigate = useNavigate();
  const counts = data?.counts || {};
  return (
    <>
      <PageHeader title="Guides" subtitle="Long-form buying guides. Scheduled guides go live automatically at their publish time."
        actions={<ButtonLink to="/admin/guides/new" size="sm" icon="plus">New guide</ButtonLink>} />
      <Tabs value={status} onChange={setStatus} tabs={[
        ['', `All ${counts.total ?? ''}`], ['published', `Published ${counts.published ?? ''}`], ['draft', `Drafts ${counts.draft ?? ''}`],
        ['scheduled', `Scheduled ${counts.scheduled ?? ''}`], ['archived', `Archived ${counts.archived ?? ''}`],
      ]} />
      <input className="input mb-4 max-w-sm" placeholder="Search guides…" value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <AdminTable rows={data?.items} onRowClick={(g) => navigate(`/admin/guides/${g.id}`)} empty="No guides match." columns={[
          { key: 'title', label: 'Guide', render: (g) => (
            <div className="flex items-center gap-3">
              {g.hero_image ? <img src={sized(g.hero_image, 96)} alt="" className="h-10 w-14 shrink-0 object-cover" /> : <span className="h-10 w-14 shrink-0 bg-paper-2" />}
              <div className="min-w-0">
                <p className="truncate font-medium">{g.title}</p>
                <p className="truncate font-mono text-[0.7rem] text-muted">/guides/{g.slug}</p>
              </div>
            </div>
          ) },
          { key: 'status', label: 'Status', render: (g) => <StatusPill status={g.status} /> },
          { key: 'category_name', label: 'Category' },
          { key: 'product_count', label: 'Picks', className: 'text-right font-mono' },
          { key: 'featured', label: '', render: (g) => (g.featured ? <span className="font-mono text-[0.7rem] text-accent-ink">★ featured</span> : '') },
          { key: 'updated_at', label: 'Updated', render: (g) => new Date(g.updated_at).toLocaleDateString() },
        ]} />
      )}
    </>
  );
}

// ===========================================================================
const EMPTY = {
  title: '', slug: '', subtitle: '', excerpt: '', quick_answer: '', hero_image: '', hero_image_alt: '', hero_motion: '', author_id: null,
  primary_category_id: null, status: 'draft', published_at: null, content: [], pros: [], cons: [], buying_considerations: [],
  faq: [], featured: false, seo: {}, category_ids: [], products: [], related_guide_ids: [], pinterest: null,
};

function toForm(g) {
  return {
    ...EMPTY,
    ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, g[k] ?? EMPTY[k]])),
    content: withBlockIds(g.content),
    buying_considerations: withBlockIds(g.buying_considerations),
    products: g.picks.map((p) => ({ product_id: p.product_id, label: p.label || '', note: p.note || '', is_primary: p.is_primary })),
    pinterest: g.pinterest ? { title: g.pinterest.title, description: g.pinterest.description, image_url: g.pinterest.image_url, destination_url: g.pinterest.destination_url, board: g.pinterest.board, status: g.pinterest.status } : null,
  };
}

function PicksEditor({ value, onChange }) {
  const { data } = useLookups();
  const products = data?.products || [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const set = (i, patch) => onChange(value.map((p, j) => (j === i ? { ...p, ...patch } : patch.is_primary ? { ...p, is_primary: false } : p)));
  const [adding, setAdding] = useState('');
  return (
    <div className="grid gap-3">
      {value.map((pick, i) => {
        const p = byId.get(pick.product_id);
        return (
          <div key={pick.product_id} className={`rounded-sm border bg-paper p-3 ${pick.is_primary ? 'border-accent' : 'border-line'}`}>
            <div className="flex items-center gap-3">
              <MoveButtons index={i} length={value.length} onMove={(a, b) => onChange(swap(value, a, b))} />
              {p?.image && <img src={sized(p.image, 80)} alt="" className="h-10 w-10 object-cover" />}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.88rem] font-medium">{i + 1}. {p?.name || `Product #${pick.product_id}`}</p>
                <Link to={`/admin/products/${pick.product_id}`} className="text-[0.72rem] text-muted underline">Edit product</Link>
              </div>
              <label className="flex items-center gap-1.5 text-[0.78rem]">
                <input type="radio" name="primary-pick" checked={pick.is_primary} onChange={() => set(i, { is_primary: true })} /> Top pick
              </label>
              <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-faint hover:text-accent-ink" aria-label="Remove pick"><Icon name="trash" size={16} /></button>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-[200px_1fr]">
              <input className="input" placeholder="Label, e.g. Best overall" value={pick.label} onChange={(e) => set(i, { label: e.target.value })} />
              <input className="input" placeholder="Why it's here (optional — shown as “Why we like it”)" value={pick.note} onChange={(e) => set(i, { note: e.target.value })} />
            </div>
          </div>
        );
      })}
      <div className="flex gap-2">
        <select className="input" value={adding} onChange={(e) => setAdding(e.target.value)}>
          <option value="">Add a product…</option>
          {products.filter((p) => !value.some((v) => v.product_id === p.id)).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <Button type="button" size="sm" variant="subtle" className="!h-[38px]" disabled={!adding}
          onClick={() => { onChange([...value, { product_id: Number(adding), label: '', note: '', is_primary: value.length === 0 }]); setAdding(''); }}>Add</Button>
      </div>
      <p className="text-[0.75rem] text-muted">Products are shared: editing one updates it in every guide. The top pick gets the larger featured layout.</p>
    </div>
  );
}

export function GuideEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const confirm = useConfirm();
  const [run, busy] = useAction();
  const lookups = useLookups();
  const { data, error, loading, reload } = useAdminData(isNew ? null : `/admin/guides/${id}`);
  const [form, setForm] = useState(EMPTY);
  const [dirty, setDirty] = useState(false);
  const [tab, setTab] = useState('content');

  useEffect(() => {
    if (data) {
      setForm(toForm(data));
      setDirty(false);
    }
  }, [data]);

  useEffect(() => {
    const warn = (e) => dirty && (e.preventDefault(), (e.returnValue = ''));
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = useCallback((k) => (v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true); }, []);
  const setContent = useCallback((v) => { setForm((f) => ({ ...f, content: v })); setDirty(true); }, []);
  const setConsiderations = useCallback((v) => { setForm((f) => ({ ...f, buying_considerations: v })); setDirty(true); }, []);

  const save = async (overrides = {}) => {
    const body = { ...form, ...overrides };
    if (!body.slug) delete body.slug;
    const saved = await run(() => (isNew ? api.post('/admin/guides', body) : api.put(`/admin/guides/${id}`, body)), overrides.status === 'published' ? 'Published' : 'Saved');
    clearCache('/guides');
    clearCache('/homepage');
    setDirty(false);
    lookups.reload();
    if (isNew) navigate(`/admin/guides/${saved.data.id}`, { replace: true });
    else setForm(toForm(saved.data));
    return saved.data;
  };

  if (!isNew && loading && !data) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;

  const previewUrl = `/guides/${form.slug || data?.slug}?preview=1`;
  const liveUrl = `${window.location.origin}/guides/${form.slug || data?.slug}`;
  const isLive = data?.is_live;

  return (
    <>
      <PageHeader back="/admin/guides" title={isNew ? 'New guide' : form.title || 'Untitled guide'}
        subtitle={!isNew && <span className="flex items-center gap-2"><StatusPill status={data?.status} /> {isLive ? 'Live on the site' : 'Not public'}{dirty && ' · unsaved changes'}</span>}
        actions={<>
          {!isNew && <a href={previewUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line-strong px-3 text-[0.8rem] hover:border-ink"><Icon name="eye" size={15} /> Preview</a>}
          <Button size="sm" variant="outline" loading={busy} onClick={() => save()}>Save</Button>
          {form.status !== 'published' && <Button size="sm" loading={busy} onClick={() => save({ status: 'published', published_at: form.status === 'scheduled' ? null : form.published_at })}>Publish now</Button>}
        </>} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          <Panel>
            <div className="grid gap-4">
              <TextInput label="Title" value={form.title} onChange={(v) => { set('title')(v); if (isNew && !form._slugTouched) setForm((f) => ({ ...f, title: v, slug: slugify(v) })); }} className="[&_input]:font-serif [&_input]:text-[1.4rem]" />
              <TextInput label="Subtitle" value={form.subtitle} onChange={set('subtitle')} />
              <TextArea label="Short description" hint="Used on cards and as the default meta description." value={form.excerpt} onChange={set('excerpt')} counter={200} rows={2} />
              <TextArea label="Quick answer" hint="The one-paragraph summary at the top of the guide." value={form.quick_answer} onChange={set('quick_answer')} rows={3} />
            </div>
          </Panel>

          <div className="mt-6">
            <Tabs value={tab} onChange={setTab} tabs={[['content', 'Article'], ['picks', `Products (${form.products.length})`], ['advice', 'Buying advice'], ['faq', `FAQ (${form.faq.length})`], ['verdict', 'Pros & cons']]} />
            {tab === 'content' && <BlockEditor value={form.content} onChange={setContent} />}
            {tab === 'picks' && <PicksEditor value={form.products} onChange={set('products')} />}
            {tab === 'advice' && <BlockEditor value={form.buying_considerations} onChange={setConsiderations} />}
            {tab === 'faq' && <FaqEditor value={form.faq} onChange={set('faq')} />}
            {tab === 'verdict' && (
              <div className="grid gap-4 md:grid-cols-2">
                <ListInput label="Overall pros" value={form.pros} onChange={set('pros')} />
                <ListInput label="Overall cons" value={form.cons} onChange={set('cons')} />
              </div>
            )}
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-1 content-start gap-5">
          <Panel title="Publishing">
            <div className="grid gap-4">
              <SelectInput label="Status" value={form.status} onChange={set('status')} options={[
                { value: 'draft', label: 'Draft' }, { value: 'scheduled', label: 'Scheduled' }, { value: 'published', label: 'Published' }, { value: 'archived', label: 'Archived' },
              ]} />
              {(form.status === 'scheduled' || form.status === 'published') && (
                <TextInput label={form.status === 'scheduled' ? 'Publish at' : 'Published at'} type="datetime-local" value={toLocalInput(form.published_at)} onChange={(v) => set('published_at')(fromLocalInput(v))} />
              )}
              <Toggle label="Featured guide" hint="Eligible for featured slots on the homepage." checked={form.featured} onChange={set('featured')} />
              {!isNew && (
                <div className="flex flex-wrap gap-2 border-t border-line pt-4">
                  {isLive && <a href={liveUrl} target="_blank" rel="noreferrer" className="text-[0.8rem] underline">View live</a>}
                  {data?.status === 'published' && <button className="text-[0.8rem] underline" onClick={() => save({ status: 'draft' })}>Unpublish</button>}
                  <button className="text-[0.8rem] underline" onClick={async () => {
                    const { data: d } = await run(() => api.post(`/admin/guides/${id}/duplicate`), 'Duplicated as a draft');
                    lookups.reload();
                    navigate(`/admin/guides/${d.id}`);
                  }}>Duplicate</button>
                  <button className="text-[0.8rem] text-accent-ink underline" onClick={async () => {
                    if (!(await confirm({ title: 'Delete this guide?', message: 'This removes the guide and its Pinterest data. Products are not deleted.' }))) return;
                    await run(() => api.delete(`/admin/guides/${id}`), 'Guide deleted');
                    clearCache('/guides');
                    lookups.reload();
                    navigate('/admin/guides');
                  }}>Delete</button>
                </div>
              )}
            </div>
          </Panel>
          <Panel title="Hero image">
            <ImageField label="" hint="An image or a video link (MP4). Videos play silently on a loop." value={form.hero_image} onChange={set('hero_image')} alt={form.hero_image_alt} onAltChange={set('hero_image_alt')} aspect="16/9" />
            <div className="mt-4"><SelectInput label="Live motion scene (optional)" hint="An animated scene built into the site. Shown instead of the image above." value={form.hero_motion || ''} onChange={set('hero_motion')} placeholder="— None, use the image —" options={Object.entries(MOTION_SCENES).map(([value, s]) => ({ value, label: s.label }))} /></div>
          </Panel>
          <Panel title="Organisation">
            <div className="grid gap-4">
              <TextInput label="URL slug" value={form.slug} onChange={(v) => { setForm((f) => ({ ...f, slug: slugify(v), _slugTouched: true })); setDirty(true); }} hint={`/guides/${form.slug || '…'}`} />
              <CategorySelect label="Primary category" value={form.primary_category_id} onChange={set('primary_category_id')} />
              <CategoryMultiPicker label="Also appears in" value={form.category_ids} onChange={set('category_ids')} />
              <SelectInput label="Author" value={form.author_id ?? ''} onChange={(v) => set('author_id')(v ? Number(v) : null)} placeholder="— You —"
                options={(lookups.data?.authors || []).map((a) => ({ value: a.id, label: a.display_name }))} />
              <GuideMultiPicker label="Related guides" value={form.related_guide_ids} onChange={set('related_guide_ids')} excludeId={Number(id)} />
            </div>
          </Panel>
          <SeoFields value={form.seo} onChange={set('seo')} fallbackTitle={form.title} fallbackDescription={form.excerpt} path={`/guides/${form.slug}`} />
          <PinterestFields value={form.pinterest} onChange={set('pinterest')} fallbackTitle={form.title} fallbackImage={form.hero_image} url={liveUrl} />
        </div>
      </div>
    </>
  );
}
