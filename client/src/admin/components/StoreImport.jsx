// Browse a partner store's catalogue and import selected products in one go.
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { sized } from '../../lib/image.js';
import { clearCache } from '../../lib/useFetch.js';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { AdminModal, Toggle, useAction, useLookups, SelectInput } from './ui.jsx';
import { CategorySelect } from './Pickers.jsx';

export default function StoreImport({ open, onClose, onImported }) {
  const lookups = useLookups();
  const partners = useMemo(() => (lookups.data?.programs || []).filter((p) => p.active && p.slug !== 'amazon' && p.base_domain), [lookups.data]);
  const [programId, setProgramId] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [picked, setPicked] = useState(() => new Set());
  const [categoryId, setCategoryId] = useState(null);
  const [subcategoryId, setSubcategoryId] = useState(null);
  const [inStockOnly, setInStockOnly] = useState(true);
  const [publish, setPublish] = useState(false);
  const [run, busy] = useAction();

  useEffect(() => {
    if (open && !programId && partners[0]) setProgramId(String(partners[0].id));
  }, [open, partners, programId]);

  // Load (or reload) the catalogue when the store, search or page changes.
  useEffect(() => {
    if (!open || !programId) return undefined;
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/admin/products/import/feed', { params: { program_id: programId, q, page }, timeout: 60000 });
        if (cancelled) return;
        setItems((prev) => (page === 1 ? data.items : [...prev, ...data.items]));
        setHasMore(data.hasMore);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || 'Could not load the store catalogue');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 300);
    return () => { cancelled = true; clearTimeout(t); };
  }, [open, programId, q, page]);

  const visible = items.filter((i) => !inStockOnly || i.available);
  const toggle = (h) => setPicked((s) => { const n = new Set(s); n.has(h) ? n.delete(h) : n.add(h); return n; });
  const program = partners.find((p) => String(p.id) === programId);

  const doImport = async () => {
    const { data } = await run(
      () => api.post('/admin/products/import', {
        program_id: Number(programId),
        handles: [...picked],
        category_id: categoryId,
        subcategory_id: subcategoryId,
        active: publish,
        tags: [],
      }, { timeout: 180000 }),
    );
    const note = [`${data.added} imported`, data.skipped && `${data.skipped} already in your catalogue`, data.failed && `${data.failed} couldn’t be loaded`].filter(Boolean).join(' · ');
    clearCache('/');
    setPicked(new Set());
    setItems((prev) => prev.map((i) => (picked.has(i.handle) ? { ...i, imported: true } : i)));
    onImported?.(note);
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Import from a partner store" wide
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <span className="text-[0.8rem] text-muted">{picked.size} selected{picked.size >= 60 ? ' (max 60 per import)' : ''}</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
            <Button size="sm" loading={busy} disabled={!picked.size || !categoryId} onClick={doImport}>
              Import {picked.size || ''} product{picked.size === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      }>
      {!partners.length ? (
        <p className="text-sm text-muted">No partner stores yet. Add one in <a className="underline" href="/admin/settings/affiliate">Affiliate settings</a> with its domain (e.g. popsyclothing.co.uk).</p>
      ) : (
        <div className="grid gap-4">
          <div className="grid gap-3 md:grid-cols-[200px_1fr]">
            <SelectInput label="Store" value={programId} onChange={(v) => { setProgramId(v); setPage(1); setPicked(new Set()); }} options={partners.map((p) => ({ value: String(p.id), label: p.name }))} />
            <label className="block">
              <span className="label">Search this store</span>
              <input className="input" placeholder="e.g. cardigan, dress, bag" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            </label>
          </div>
          <div className="grid gap-3 rounded-sm border border-line bg-paper p-3 md:grid-cols-2">
            <CategorySelect label="Put imported products in" value={categoryId} onChange={setCategoryId} placeholder="— Choose a category —" />
            <CategorySelect label="Subcategory (optional)" value={subcategoryId} onChange={setSubcategoryId} />
            <Toggle label="In stock only" checked={inStockOnly} onChange={setInStockOnly} />
            <Toggle label="Publish immediately" hint="Off = imported hidden, so you can add notes and check tracking first." checked={publish} onChange={setPublish} />
          </div>
          {program && !program.link_template && !(program.tracking_param && program.tracking_id) && (
            <p className="rounded-sm border-l-2 border-accent bg-accent-soft/50 px-3 py-2 text-[0.8rem]">
              {program.name} has no tracking code set yet. Add it in <a className="underline" href="/admin/settings/affiliate">Affiliate settings</a> before publishing, or clicks won’t be credited to you.
            </p>
          )}
          {error && <p className="text-sm text-accent-ink" role="alert">{error}</p>}
          <div className="grid max-h-[46vh] grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-4 lg:grid-cols-5">
            {visible.map((i) => {
              const on = picked.has(i.handle);
              return (
                <button key={i.handle} type="button" disabled={i.imported} onClick={() => toggle(i.handle)}
                  className={`group relative overflow-hidden rounded-sm border text-left transition-colors ${on ? 'border-ink ring-2 ring-ink' : 'border-line hover:border-ink'} disabled:cursor-default disabled:opacity-50`}>
                  <span className="block aspect-[4/5] bg-paper-2">
                    {i.images[0] && <img src={sized(i.images[0].url, 300, { height: 375 })} alt="" loading="lazy" className="h-full w-full object-cover" />}
                  </span>
                  <span className="block p-2">
                    <span className="line-clamp-2 text-[0.78rem] leading-snug font-medium">{i.name}</span>
                    <span className="mt-0.5 block text-[0.68rem] text-muted">{i.product_type}{!i.available ? ' · out of stock' : ''}</span>
                  </span>
                  {(on || i.imported) && (
                    <span className={`absolute top-1.5 right-1.5 flex h-6 items-center gap-1 rounded-full px-2 text-[0.66rem] font-medium ${i.imported ? 'bg-paper text-ink' : 'bg-ink text-paper'}`}>
                      <Icon name="check" size={12} /> {i.imported ? 'Imported' : 'Selected'}
                    </span>
                  )}
                </button>
              );
            })}
            {!loading && !visible.length && <p className="col-span-full py-8 text-center text-sm text-muted">No products match.</p>}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[0.78rem] text-muted">{loading ? 'Loading…' : `${visible.length} shown`}</span>
            {hasMore && !loading && <Button size="sm" variant="subtle" onClick={() => setPage((p) => p + 1)}>Load more</Button>}
          </div>
        </div>
      )}
    </AdminModal>
  );
}
