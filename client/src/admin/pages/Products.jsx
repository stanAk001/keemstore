import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { clearCache } from '../../lib/useFetch.js';
import { sized } from '../../lib/image.js';
import { slugify, price as fmtPrice } from '../../lib/format.js';
import Button, { ButtonLink } from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import {
  PageHeader, Panel, Loading, LoadError, AdminTable, StatusPill, TextInput, TextArea, SelectInput, Toggle, ListInput,
  MoveButtons, swap, useAdminData, useAction, useConfirm, useLookups, useToast, toLocalInput, fromLocalInput, CopyButton,
} from '../components/ui.jsx';
import { ImageField } from '../components/MediaPicker.jsx';
import { CategorySelect } from '../components/Pickers.jsx';
import StoreImport from '../components/StoreImport.jsx';

export function ProductsList() {
  const [params, setParams] = useSearchParams();
  const [q, setQ] = useState(params.get('q') || '');
  const category = params.get('category') || '';
  const active = params.get('active') || '';
  const missing = params.get('missing') === '1';
  const demo = params.get('demo') || '';
  const page = Number(params.get('page')) || 1;
  const query = new URLSearchParams({ limit: '50', page: String(page), ...(q ? { q } : {}), ...(category ? { category } : {}), ...(active ? { active } : {}), ...(missing ? { missing: '1' } : {}), ...(demo ? { demo } : {}) });
  const { data, error, loading, reload } = useAdminData(`/admin/products?${query}`);
  const navigate = useNavigate();
  const set = (k, v) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); n.delete('page'); setParams(n); };
  const [importOpen, setImportOpen] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [run, busy] = useAction();
  const toast = useToast();
  const pageIds = (data?.items || []).map((p) => p.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  const toggleOne = (id) => setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleAll = () => setSelected((s) => { const n = new Set(s); pageIds.forEach((id) => (allOnPage ? n.delete(id) : n.add(id))); return n; });
  const bulk = async (on) => {
    await run(() => api.post('/admin/products/bulk-active', { ids: [...selected], active: on }), on ? 'Products are now live on the site' : 'Products hidden from the site');
    setSelected(new Set());
    clearCache('/');
    reload();
  };

  return (
    <>
      <PageHeader title="Products" subtitle="Add a product once and reuse it in any guide, collection or section. Edits show up everywhere it appears."
        actions={<>
          <Button size="sm" variant="outline" icon="upload" onClick={() => setImportOpen(true)}>Import from store</Button>
          <ButtonLink to="/admin/products/new" size="sm" icon="plus">New product</ButtonLink>
        </>} />
      <StoreImport open={importOpen} onClose={() => setImportOpen(false)} onImported={(note) => { toast(note); reload(); }} />
      {selected.size > 0 && (
        <div className="sticky top-14 z-20 mb-3 flex flex-wrap items-center gap-3 rounded-sm bg-ink px-4 py-2.5 text-[0.85rem] text-paper lg:top-2">
          <span className="font-medium">{selected.size} selected</span>
          <Button size="sm" variant="accent" loading={busy} onClick={() => bulk(true)}>Show on site</Button>
          <Button size="sm" variant="subtle" loading={busy} onClick={() => bulk(false)}>Hide</Button>
          <button className="ml-auto underline" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <input className="input max-w-xs" placeholder="Search name or brand…" value={q} onChange={(e) => { setQ(e.target.value); set('q', e.target.value); }} />
        <div className="w-56"><CategorySelect label="" value={category ? Number(category) : null} onChange={(v) => set('category', v ? String(v) : '')} placeholder="All categories" /></div>
        <select className="input max-w-40" value={active} onChange={(e) => set('active', e.target.value)}>
          <option value="">Active & inactive</option><option value="true">Active</option><option value="false">Inactive</option>
        </select>
        <select className="input max-w-44" value={demo} onChange={(e) => set('demo', e.target.value)}>
          <option value="">Demo & real</option><option value="true">Demo only (to upgrade)</option><option value="false">Real picks only</option>
        </select>
        {missing && <button className="rounded-full bg-accent-soft px-3 text-[0.8rem] text-accent-ink" onClick={() => set('missing', '')}>Missing links ✕</button>}
      </div>
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <>
          <AdminTable rows={data?.items} onRowClick={(p) => navigate(`/admin/products/${p.id}`)} empty="No products match." columns={[
            { key: 'select', className: 'w-10',
              label: <input type="checkbox" aria-label="Select all on this page" checked={allOnPage} onChange={toggleAll} />,
              render: (p) => <input type="checkbox" aria-label={`Select ${p.name}`} checked={selected.has(p.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleOne(p.id)} /> },
            { key: 'name', label: 'Product', render: (p) => (
              <div className="flex items-center gap-3">
                {p.image ? <img src={sized(p.image.url, 80)} alt="" className="h-10 w-10 shrink-0 object-cover" /> : <span className="h-10 w-10 shrink-0 bg-paper-2" />}
                <div className="min-w-0"><p className="truncate font-medium">{p.name}</p><p className="truncate text-[0.72rem] text-muted">{p.brand || p.category_name}</p></div>
              </div>
            ) },
            { key: 'price', label: 'Price', render: (p) => <span className="font-mono">{fmtPrice(p) || '—'}</span> },
            { key: 'link', label: 'Retailer link', render: (p) => (p.outbound?.url ? <span className="text-good">✓ {p.outbound.retailer}</span> : <StatusPill status="missing" />) },
            { key: 'state', label: 'Status', render: (p) => <span className="flex gap-1">{<StatusPill status={p.active ? 'active' : 'inactive'} />}{p.featured && <StatusPill status="ready" />}{p.is_demo && <StatusPill status="draft" />}{p.placement !== 'editorial' && <StatusPill status="scheduled" />}</span> },
            { key: 'updated_at', label: 'Updated', render: (p) => new Date(p.updated_at).toLocaleDateString() },
          ]} />
          {data?.pages > 1 && (
            <div className="mt-4 flex items-center gap-3 text-sm">
              <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => { const n = new URLSearchParams(params); n.set('page', page - 1); setParams(n); }}>Previous</Button>
              <span className="font-mono">{page} / {data.pages}</span>
              <Button size="sm" variant="ghost" disabled={page >= data.pages} onClick={() => { const n = new URLSearchParams(params); n.set('page', page + 1); setParams(n); }}>Next</Button>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ===========================================================================
const bareHost = (h) => String(h || '').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '');

/** The active partner program (not Amazon) whose domain matches `host`. */
export function partnerFor(host, programs = []) {
  const h = bareHost(host);
  return programs.find((p) => p.active && p.slug !== 'amazon' && p.base_domain && (h === bareHost(p.base_domain) || h.endsWith(`.${bareHost(p.base_domain)}`))) || null;
}

/** Read what a pasted retailer link will do, so mistakes show up before saving. */
function inspectLink(raw, programs) {
  if (!raw) return null;
  let u;
  try {
    u = new URL(raw.trim());
  } catch {
    return { tone: 'bad', text: 'That doesn’t look like a full link. It should start with https://' };
  }
  const host = bareHost(u.hostname);
  const yourTag = programs.find((p) => p.slug === 'amazon')?.tracking_id;
  if (host === 'amzn.to') return { tone: 'ok', text: 'Amazon short link — your tag is built into it. Used exactly as pasted.' };
  if (/(^|\.)amazon\.[a-z.]+$/.test(host)) {
    const tag = u.searchParams.get('tag');
    if (!tag) return { tone: 'ok', text: yourTag ? `Amazon link — your tag ${yourTag} will be added automatically.` : 'Amazon link with no tag. Set your Associates tag in Affiliate settings so it gets added.' };
    if (yourTag && tag !== yourTag) return { tone: 'bad', text: `This link uses the tag “${tag}”, not your tag “${yourTag}”. Commission would go to that tag.` };
    return { tone: 'ok', text: `Amazon link with your tag ${tag}. ✓` };
  }
  // Network redirect links (Rakuten, Awin) carry the store page inside them.
  const innerParam = { 'click.linksynergy.com': 'murl', 'awin1.com': 'ued' }[host];
  if (innerParam) {
    let inner = null;
    try {
      inner = new URL(u.searchParams.get(innerParam) || '');
    } catch {
      /* no store page inside */
    }
    const wrapped = inner && partnerFor(inner.hostname, programs);
    if (!wrapped) return { tone: 'bad', text: `This network link doesn’t point to a store set up in Affiliate settings.` };
    // Compare the publisher ID in the pasted link with the one in the program's template.
    let yourId = null;
    try {
      yourId = wrapped.link_template ? new URL(wrapped.link_template.replace('{url}', '')).searchParams.get('id') : null;
    } catch {
      /* malformed template — skip the ID check */
    }
    const linkId = u.searchParams.get('id');
    if (yourId && linkId && yourId !== linkId) return { tone: 'bad', text: `This link uses the ID “${linkId}”, not your ID “${yourId}”. Commission would go to someone else.`, partner: wrapped };
    return { tone: 'ok', text: `${wrapped.name} link with your tracking built in. Used exactly as pasted. ✓`, partner: wrapped };
  }
  const partner = partnerFor(host, programs);
  if (partner) {
    if (partner.link_template) return { tone: 'ok', text: `${partner.name} link — it’s wrapped in your ${partner.network || 'affiliate'} tracking link automatically when clicked. ✓`, partner };
    const tracked = partner.tracking_param && partner.tracking_id;
    const inLink = partner.tracking_param && u.searchParams.has(partner.tracking_param);
    return tracked || inLink
      ? { tone: 'ok', text: `${partner.name} link — ${inLink ? 'your tracking code is in the link' : `your tracking (${partner.tracking_param}=${partner.tracking_id}) is added automatically`}. ✓`, partner }
      : { tone: 'bad', text: `${partner.name} link — but no tracking code is set up yet, so sales won’t be credited to you. Add it in Affiliate settings → ${partner.name}, or paste your full affiliate link.`, partner };
  }
  return { tone: 'bad', text: `No affiliate program is set up for ${host}, so clicks won’t earn commission. Add it in Affiliate settings first.` };
}

function AffiliateLinkField({ value, onChange, onAsin, onFill, programs }) {
  const info = inspectLink(value, programs);
  const [run, busy] = useAction();
  const fill = async () => {
    const { data } = await run(() => api.post('/admin/products/import/preview', { url: value }), 'Details filled from the store — review before saving');
    onFill(data);
  };
  return (
    <div className="rounded-sm border-2 border-ink bg-card p-4 md:col-span-2">
      <label className="block">
        <span className="label !text-[0.85rem] !font-semibold">Affiliate link</span>
        <input
          className="input !text-[0.85rem]"
          placeholder="Paste an Amazon SiteStripe link or a partner store product link"
          value={value || ''}
          onChange={(e) => {
            const v = e.target.value.trim();
            onChange(v);
            // Pull the ASIN out of Amazon product links so it's recorded too.
            const asin = v.match(/amazon\.[a-z.]+\/(?:.*\/)?(?:dp|gp\/product)\/([A-Z0-9]{10})/i)?.[1];
            if (asin) onAsin(asin.toUpperCase());
          }}
        />
      </label>
      {info ? (
        <p className={`mt-2 text-[0.8rem] ${info.tone === 'bad' ? 'font-medium text-accent-ink' : 'text-good'}`}>{info.text}</p>
      ) : (
        <p className="mt-2 text-[0.78rem] text-muted">
          Amazon: open the product while signed in to Associates, click <strong>Get Link → Text</strong> in SiteStripe, and paste it here.
          Partner stores (e.g. Popsy Clothing): paste the product page link, then use <strong>Fill from link</strong>.
        </p>
      )}
      {info?.partner && (
        <Button type="button" size="sm" variant="outline" icon="upload" className="mt-3" loading={busy} onClick={fill}>
          Fill from link
        </Button>
      )}
    </div>
  );
}

const EMPTY = {
  name: '', slug: '', brand: '', short_description: '', description: '', category_id: null, subcategory_id: null,
  amazon_url: '', affiliate_url: '', asin: '', current_price: '', price_display: '', price_source: '', price_checked_at: null,
  rating: '', review_count: '', rating_source: '', rating_checked_at: null, pros: [], cons: [], best_for: '', not_for: '',
  editor_note: '', tags: [], placement: 'editorial', featured: false, active: true, is_demo: false, images: [], affiliate_links: [],
};

const toForm = (p) => ({
  ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, p[k] ?? EMPTY[k]])),
  images: p.images.map((i) => ({ url: i.url, alt: i.alt || '', credit: i.credit || '' })),
  affiliate_links: p.affiliate_links.map((l) => ({ id: l.id, program_id: l.program_id, url: l.url, label: l.label || '', is_primary: l.is_primary, active: l.active })),
});

export function ProductEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const confirm = useConfirm();
  const lookups = useLookups();
  const [run, busy] = useAction();
  const { data, error, loading, reload } = useAdminData(isNew ? null : `/admin/products/${id}`);
  const [form, setForm] = useState(EMPTY);
  const programs = lookups.data?.programs || [];

  useEffect(() => { if (data) setForm(toForm(data)); }, [data]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const body = { ...form, images: form.images.filter((i) => i.url) };
    if (!body.slug) delete body.slug;
    const saved = await run(() => (isNew ? api.post('/admin/products', body) : api.put(`/admin/products/${id}`, body)), 'Product saved');
    clearCache('/');
    lookups.reload();
    if (isNew) navigate(`/admin/products/${saved.data.id}`, { replace: true });
    else reload();
  };

  if (!isNew && loading && !data) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;

  const setImage = (i, patch) => set('images')(form.images.map((im, j) => (j === i ? { ...im, ...patch } : im)));
  const setLink = (i, patch) => set('affiliate_links')(form.affiliate_links.map((l, j) => (j === i ? { ...l, ...patch } : patch.is_primary ? { ...l, is_primary: false } : l)));

  return (
    <>
      <PageHeader back="/admin/products" title={isNew ? 'New product' : form.name || 'Untitled product'}
        actions={<>
          {!isNew && data?.active && <a href={`/products/${data.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line-strong px-3 text-[0.8rem] hover:border-ink"><Icon name="external" size={14} /> View</a>}
          <Button size="sm" loading={busy} onClick={save}>Save product</Button>
        </>} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <Panel title="Basics">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput className="md:col-span-2" label="Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v, ...(isNew && !f._slug ? { slug: slugify(v) } : {}) }))} />
              <AffiliateLinkField
                value={form.affiliate_url}
                onChange={set('affiliate_url')}
                onAsin={(a) => setForm((f) => (f.asin ? f : { ...f, asin: a }))}
                programs={programs}
                // Only fills fields that are still empty, so nothing you've written is overwritten.
                onFill={(d) => setForm((f) => ({
                  ...f,
                  name: f.name || d.name,
                  slug: f.slug || (isNew ? slugify(d.name) : f.slug),
                  brand: f.brand || d.brand || '',
                  short_description: f.short_description || d.short_description || '',
                  description: f.description || d.description || '',
                  images: f.images.length ? f.images : (d.images || []).map((im) => ({ url: im.url, alt: im.alt || '', credit: '' })),
                  tags: [...new Set([...f.tags, ...(d.tags || [])])],
                  // Keep the pasted link as-is: it may carry the tracking code.
                  affiliate_url: f.affiliate_url || d.affiliate_url,
                  is_demo: false,
                }))}
              />
              <TextInput label="Brand" value={form.brand} onChange={set('brand')} />
              <TextInput label="URL slug" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: slugify(v), _slug: true }))} hint={`/products/${form.slug || '…'}`} />
              <TextArea className="md:col-span-2" label="Short description" value={form.short_description} onChange={set('short_description')} counter={200} rows={2} />
              <TextArea className="md:col-span-2" label="Description" value={form.description} onChange={set('description')} rows={4} />
              <CategorySelect label="Category" value={form.category_id} onChange={set('category_id')} />
              <CategorySelect label="Subcategory" value={form.subcategory_id} onChange={set('subcategory_id')} hint="Optional — a more specific category." />
            </div>
          </Panel>

          <Panel title="Editorial" description="The context that makes a recommendation useful. Keep it honest and specific.">
            <div className="grid gap-4 md:grid-cols-2">
              <TextArea label="Best for (who should buy it)" value={form.best_for} onChange={set('best_for')} rows={2} />
              <TextArea label="Not for (who should skip it)" value={form.not_for} onChange={set('not_for')} rows={2} />
              <ListInput label="Pros" value={form.pros} onChange={set('pros')} />
              <ListInput label="Cons / worth knowing" value={form.cons} onChange={set('cons')} />
              <TextArea className="md:col-span-2" label="Editor's note" value={form.editor_note} onChange={set('editor_note')} rows={2} />
              <ListInput label="Tags / use cases" hint="Used for filters and sections, e.g. lazy, under-25, halloween." value={form.tags} onChange={(v) => set('tags')(v.map((t) => slugify(t)))} placeholder="Add a tag" />
            </div>
          </Panel>

          <Panel title="Images" description="The first image is the main one. Use images you have the right to use.">
            <div className="grid gap-4">
              {form.images.map((im, i) => (
                <div key={i} className="flex gap-3 rounded-sm border border-line bg-paper p-3">
                  <MoveButtons index={i} length={form.images.length} onMove={(a, b) => set('images')(swap(form.images, a, b))} />
                  <div className="flex-1">
                    <ImageField label={i === 0 ? 'Main image' : `Image ${i + 1}`} value={im.url} onChange={(v) => setImage(i, { url: v })} alt={im.alt} onAltChange={(v) => setImage(i, { alt: v })} aspect="4/5" />
                    <input className="input mt-2 text-[0.78rem]" placeholder="Credit (optional)" value={im.credit} onChange={(e) => setImage(i, { credit: e.target.value })} />
                  </div>
                  <button type="button" onClick={() => set('images')(form.images.filter((_, j) => j !== i))} className="self-start text-faint hover:text-accent-ink" aria-label="Remove image"><Icon name="trash" size={16} /></button>
                </div>
              ))}
              <Button type="button" size="sm" variant="subtle" icon="plus" className="justify-self-start" onClick={() => set('images')([...form.images, { url: '', alt: '', credit: '' }])}>Add image</Button>
            </div>
          </Panel>

          <Panel title="Other ways to link" description="Optional. Most products only need the Amazon affiliate link above. Order used: a primary program link below, then the affiliate link above, then this Amazon URL, then the ASIN — your tag is added to Amazon URLs automatically.">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Amazon product URL" value={form.amazon_url} onChange={set('amazon_url')} placeholder="https://www.amazon.com/dp/…" hint="Plain product URL — your tag is added automatically." />
              <TextInput label="ASIN" value={form.asin} onChange={set('asin')} placeholder="B0XXXXXXXX" />
            </div>
            <div className="mt-6 border-t border-line pt-4">
              <p className="label">Links from affiliate programs</p>
              <div className="grid gap-2">
                {form.affiliate_links.map((l, i) => (
                  <div key={l.id || `n${i}`} className="grid gap-2 rounded-sm border border-line bg-paper p-3 md:grid-cols-[150px_1fr_110px_auto]">
                    <select className="input" value={l.program_id} onChange={(e) => setLink(i, { program_id: Number(e.target.value) })}>
                      {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <input className="input" placeholder="https://…" value={l.url} onChange={(e) => setLink(i, { url: e.target.value })} />
                    <input className="input" placeholder="Label" value={l.label} onChange={(e) => setLink(i, { label: e.target.value })} />
                    <div className="flex items-center gap-3 text-[0.78rem]">
                      <label className="flex items-center gap-1"><input type="radio" name="primary-link" checked={l.is_primary} onChange={() => setLink(i, { is_primary: true })} /> Primary</label>
                      <label className="flex items-center gap-1"><input type="checkbox" checked={l.active} onChange={(e) => setLink(i, { active: e.target.checked })} /> Active</label>
                      <button type="button" onClick={() => set('affiliate_links')(form.affiliate_links.filter((_, j) => j !== i))} className="text-faint hover:text-accent-ink" aria-label="Remove link"><Icon name="trash" size={15} /></button>
                    </div>
                  </div>
                ))}
                <Button type="button" size="sm" variant="subtle" icon="plus" className="justify-self-start" disabled={!programs.length}
                  onClick={() => set('affiliate_links')([...form.affiliate_links, { program_id: programs[0]?.id, url: '', label: '', is_primary: form.affiliate_links.length === 0, active: true }])}>Add program link</Button>
              </div>
            </div>
            {data?.outbound && (
              <div className="mt-5 rounded-xs bg-paper-2 p-3 text-[0.78rem]">
                <p className="font-medium">Visitors are sent to ({data.outbound.retailer || 'nowhere'}):</p>
                {data.outbound.url ? (
                  <div className="mt-1 flex items-center gap-2"><code className="min-w-0 flex-1 truncate">{data.outbound.url}</code><CopyButton text={data.outbound.url} /></div>
                ) : <p className="mt-1 text-accent-ink">No working link — buttons will show “Link unavailable”.</p>}
                <p className="mt-1 text-muted">Reflects the last saved version.</p>
              </div>
            )}
          </Panel>
        </div>

        <div className="grid min-w-0 grid-cols-1 content-start gap-5">
          <Panel title="Visibility">
            <div className="grid gap-4">
              <Toggle label="Active" hint="Inactive products disappear from the site but keep their data." checked={form.active} onChange={set('active')} />
              <Toggle label="Editor's pick" hint="Eligible for 'featured' sections." checked={form.featured} onChange={set('featured')} />
              <Toggle label="Demo listing" hint="Shows a Demo badge. Switch off once you’ve added a specific product link you stand behind." checked={form.is_demo} onChange={set('is_demo')} />
              <SelectInput label="Placement" hint="Paid placements are always labelled on the site." value={form.placement} onChange={set('placement')} options={[
                { value: 'editorial', label: 'Editorial (no label)' }, { value: 'featured', label: 'Featured partner (labelled)' }, { value: 'sponsored', label: 'Sponsored (labelled)' },
              ]} />
            </div>
          </Panel>
          <Panel title="Price (private)" description="Not shown on the site while prices are hidden (Affiliate settings). Used for “Under 5” sections, budget filters and price sorting — an approximate figure is fine.">
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Price (number)" type="number" step="0.01" min="0" value={form.current_price} onChange={set('current_price')} hint="Used for filters." />
                <TextInput label="Display" value={form.price_display} onChange={set('price_display')} placeholder="$39" />
              </div>
              <TextInput label="Source" value={form.price_source} onChange={set('price_source')} placeholder="Amazon.com listing" />
              <TextInput label="Checked on" type="datetime-local" value={toLocalInput(form.price_checked_at)} onChange={(v) => set('price_checked_at')(fromLocalInput(v))} />
            </div>
          </Panel>
          <Panel title="Rating (private)" description="Hidden on the site unless enabled in Affiliate settings. Only enter ratings you’ve actually sourced.">
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Rating (0–5)" type="number" step="0.1" min="0" max="5" value={form.rating} onChange={set('rating')} />
                <TextInput label="Review count" type="number" min="0" value={form.review_count} onChange={set('review_count')} />
              </div>
              <TextInput label="Source" value={form.rating_source} onChange={set('rating_source')} placeholder="Amazon" />
              <TextInput label="Checked on" type="datetime-local" value={toLocalInput(form.rating_checked_at)} onChange={(v) => set('rating_checked_at')(fromLocalInput(v))} />
            </div>
          </Panel>
          {!isNew && (
            <Panel title="Used in">
              {data?.guides?.length ? (
                <ul className="space-y-1.5 text-[0.85rem]">
                  {data.guides.map((g) => <li key={g.id}><Link to={`/admin/guides/${g.id}`} className="hover:underline">{g.title}</Link> <StatusPill status={g.status} /></li>)}
                </ul>
              ) : <p className="text-[0.85rem] text-muted">Not in any guide yet.</p>}
              <button className="mt-5 text-[0.8rem] text-accent-ink underline" onClick={async () => {
                if (!(await confirm({ title: 'Delete this product?', message: `It will be removed from ${data?.guides?.length || 0} guide(s) and all sections. Click history is kept. Consider making it inactive instead.` }))) return;
                await run(() => api.delete(`/admin/products/${id}`), 'Product deleted');
                clearCache('/');
                lookups.reload();
                navigate('/admin/products');
              }}>Delete product</button>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
