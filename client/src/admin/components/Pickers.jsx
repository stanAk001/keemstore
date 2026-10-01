// Searchable pickers backed by /admin/lookups.
import { useMemo, useState } from 'react';
import { sized } from '../../lib/image.js';
import Icon from '../../components/ui/Icon.jsx';
import { Field, MoveButtons, SelectInput, swap, useLookups } from './ui.jsx';

function SearchList({ items, onPick, render, placeholder }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return items.filter((i) => (i.label || '').toLowerCase().includes(term)).slice(0, 40);
  }, [items, q]);
  return (
    <div className="relative">
      <input className="input" placeholder={placeholder} value={q} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} onChange={(e) => setQ(e.target.value)} />
      {open && filtered.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-sm border border-line bg-card py-1 shadow-pop">
          {filtered.map((i) => (
            <li key={i.id}>
              <button type="button" onMouseDown={(e) => { e.preventDefault(); onPick(i); setQ(''); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.85rem] hover:bg-paper">
                {render ? render(i) : i.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const Thumb = ({ src }) => (
  <span className="h-8 w-8 shrink-0 overflow-hidden rounded-xs bg-paper-2">{src && <img src={sized(src, 80)} alt="" className="h-full w-full object-cover" />}</span>
);

/** Ordered multi-select of products. value: number[] */
export function ProductMultiPicker({ label = 'Products', hint, value = [], onChange }) {
  const { data } = useLookups();
  const products = data?.products || [];
  const byId = new Map(products.map((p) => [p.id, p]));
  const available = products.filter((p) => !value.includes(p.id)).map((p) => ({ ...p, label: p.name }));
  return (
    <Field label={label} hint={hint}>
      {value.length > 0 && (
        <ol className="mb-2 divide-y divide-line rounded-sm border border-line bg-paper">
          {value.map((id, i) => {
            const p = byId.get(id);
            return (
              <li key={id} className="flex items-center gap-3 px-2 py-1.5">
                <MoveButtons index={i} length={value.length} onMove={(a, b) => onChange(swap(value, a, b))} />
                <Thumb src={p?.image} />
                <span className="min-w-0 flex-1 truncate text-[0.85rem]">{p?.name || `#${id} (missing)`}</span>
                {p && !p.active && <span className="font-mono text-[0.65rem] text-muted uppercase">inactive</span>}
                <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} className="text-faint hover:text-accent-ink" aria-label="Remove"><Icon name="close" size={14} /></button>
              </li>
            );
          })}
        </ol>
      )}
      <SearchList items={available} placeholder="Search products to add…" onPick={(p) => onChange([...value, p.id])}
        render={(p) => <><Thumb src={p.image} /><span className="truncate">{p.name}</span><span className="ml-auto font-mono text-[0.7rem] text-muted">{p.price_display}</span></>} />
    </Field>
  );
}

export function GuideMultiPicker({ label = 'Guides', hint, value = [], onChange, excludeId }) {
  const { data } = useLookups();
  const guides = (data?.guides || []).filter((g) => g.id !== excludeId);
  const byId = new Map(guides.map((g) => [g.id, g]));
  return (
    <Field label={label} hint={hint}>
      {value.length > 0 && (
        <ol className="mb-2 divide-y divide-line rounded-sm border border-line bg-paper">
          {value.map((id, i) => (
            <li key={id} className="flex items-center gap-3 px-2 py-1.5 text-[0.85rem]">
              <MoveButtons index={i} length={value.length} onMove={(a, b) => onChange(swap(value, a, b))} />
              <span className="min-w-0 flex-1 truncate">{byId.get(id)?.title || `#${id}`}</span>
              <span className="font-mono text-[0.65rem] text-muted uppercase">{byId.get(id)?.status}</span>
              <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} className="text-faint hover:text-accent-ink" aria-label="Remove"><Icon name="close" size={14} /></button>
            </li>
          ))}
        </ol>
      )}
      <SearchList items={guides.filter((g) => !value.includes(g.id)).map((g) => ({ ...g, label: g.title }))} placeholder="Search guides to add…" onPick={(g) => onChange([...value, g.id])} />
    </Field>
  );
}

export function CategoryMultiPicker({ label = 'Categories', hint, value = [], onChange }) {
  const { data } = useLookups();
  const cats = data?.categories || [];
  return (
    <Field label={label} hint={hint}>
      <div className="flex flex-wrap gap-1.5">
        {cats.map((c) => {
          const on = value.includes(c.id);
          return (
            <button key={c.id} type="button" onClick={() => onChange(on ? value.filter((x) => x !== c.id) : [...value, c.id])}
              className={`rounded-full border px-2.5 py-1 text-[0.78rem] ${on ? 'border-ink bg-ink text-paper' : 'border-line-strong hover:border-ink'}`}>
              {c.parent_name ? `${c.parent_name} › ` : ''}{c.name}
            </button>
          );
        })}
      </div>
    </Field>
  );
}

export function TrendMultiPicker({ label = 'Trends', hint, value = [], onChange }) {
  const { data } = useLookups();
  const trends = data?.trends || [];
  const byId = new Map(trends.map((t) => [t.id, t]));
  return (
    <Field label={label} hint={hint}>
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((id) => (
            <span key={id} className="inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[0.78rem] text-paper">
              {byId.get(id)?.title || `#${id}`}
              <button type="button" onClick={() => onChange(value.filter((x) => x !== id))} aria-label="Remove"><Icon name="close" size={12} /></button>
            </span>
          ))}
        </div>
      )}
      <SearchList items={trends.filter((t) => !value.includes(t.id)).map((t) => ({ ...t, label: t.title }))} placeholder="Search trends to add…" onPick={(t) => onChange([...value, t.id])} />
    </Field>
  );
}

export function CategorySelect({ label = 'Category', value, onChange, placeholder = '— None —', topOnly = false, hint }) {
  const { data } = useLookups();
  const cats = (data?.categories || []).filter((c) => !topOnly || !c.parent_id);
  return (
    <SelectInput label={label} hint={hint} value={value ?? ''} onChange={(v) => onChange(v ? Number(v) : null)} placeholder={placeholder}
      options={cats.map((c) => ({ value: c.id, label: c.parent_name ? `${c.parent_name} › ${c.name}` : c.name }))} />
  );
}

export function GuideSelect({ label = 'Guide', value, onChange, placeholder = '— None —' }) {
  const { data } = useLookups();
  return (
    <SelectInput label={label} value={value ?? ''} onChange={(v) => onChange(v ? Number(v) : null)} placeholder={placeholder}
      options={(data?.guides || []).map((g) => ({ value: g.id, label: `${g.title}${g.status !== 'published' ? ` (${g.status})` : ''}` }))} />
  );
}
