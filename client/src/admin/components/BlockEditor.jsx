// Structured content editor. Content is an ordered list of typed blocks —
// editors never write HTML. Inline text supports **bold**, *italic* and
// [links](url), inserted with the toolbar.
import { useEffect, useRef, useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { Inline } from '../../lib/inline.jsx';
import { TextInput, TextArea, SelectInput, ListInput, Field, MoveButtons, swap, useLookups } from './ui.jsx';
import { ImageField } from './MediaPicker.jsx';
import { ProductMultiPicker } from './Pickers.jsx';

const newId = () => Math.random().toString(36).slice(2, 10);

/** Give every block a stable id. Call when loading content into a form. */
export const withBlockIds = (blocks = []) => blocks.map((b) => (b.id ? b : { ...b, id: newId() }));

const BLOCKS = {
  heading: { label: 'Heading', group: 'Text', make: () => ({ level: 2, text: '' }) },
  paragraph: { label: 'Paragraph', group: 'Text', make: () => ({ text: '' }) },
  list: { label: 'List', group: 'Text', make: () => ({ style: 'bullet', items: [] }) },
  quote: { label: 'Quote', group: 'Text', make: () => ({ text: '', cite: '' }) },
  callout: { label: 'Callout', group: 'Text', make: () => ({ tone: 'tip', title: '', text: '' }) },
  editor_note: { label: "Editor's note", group: 'Text', make: () => ({ text: '' }) },
  image: { label: 'Image', group: 'Media', make: () => ({ url: '', alt: '', caption: '' }) },
  table: { label: 'Table', group: 'Media', make: () => ({ headers: ['', ''], rows: [['', '']] }) },
  divider: { label: 'Divider', group: 'Media', make: () => ({}) },
  product: { label: 'Product recommendation', group: 'Shopping', make: () => ({ productId: null, label: '', note: '' }) },
  comparison: { label: 'Product comparison', group: 'Shopping', make: () => ({ productIds: [] }) },
  proscons: { label: 'Pros & cons', group: 'Shopping', make: () => ({ pros: [], cons: [] }) },
  verdict: { label: 'Quick verdict', group: 'Shopping', make: () => ({ title: 'The verdict', text: '', productId: null }) },
  cta: { label: 'Affiliate CTA', group: 'Shopping', make: () => ({ text: '', productId: null, label: '' }) },
  faq: { label: 'FAQ', group: 'Shopping', make: () => ({ items: [{ q: '', a: '' }] }) },
};

/** Textarea with B / I / link buttons that wrap the current selection. */
function RichText({ label, value, onChange, rows = 4, placeholder }) {
  const ref = useRef(null);
  const [preview, setPreview] = useState(false);
  const wrap = (before, after = before, fallback = 'text') => {
    const el = ref.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e } = el;
    const selected = value.slice(s, e) || fallback;
    const next = value.slice(0, s) + before + selected + after + value.slice(e);
    onChange(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + before.length, s + before.length + selected.length);
    });
  };
  const link = () => {
    const url = window.prompt('Link URL (https://… or /path)');
    if (url && /^(https?:\/\/|\/)/.test(url)) wrap('[', `](${url})`, 'link text');
  };
  const btn = 'flex h-7 min-w-7 items-center justify-center rounded-xs px-1.5 text-[0.8rem] hover:bg-paper-2';
  return (
    <Field label={label}>
      <div className="rounded-sm border border-line-strong bg-card focus-within:border-ink">
        <div className="flex items-center gap-0.5 border-b border-line px-1.5 py-1">
          <button type="button" className={`${btn} font-bold`} onClick={() => wrap('**')} title="Bold">B</button>
          <button type="button" className={`${btn} font-serif italic`} onClick={() => wrap('*')} title="Italic">I</button>
          <button type="button" className={btn} onClick={link} title="Link">Link</button>
          <button type="button" className={`${btn} ml-auto ${preview ? 'bg-paper-2' : ''}`} onClick={() => setPreview((p) => !p)}>Preview</button>
        </div>
        {preview ? (
          <p className="prose-editorial min-h-[5rem] px-3 py-2 !text-[0.95rem]"><Inline text={value} /></p>
        ) : (
          <textarea ref={ref} rows={rows} value={value || ''} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="block w-full resize-y bg-transparent px-3 py-2 text-[0.9rem] leading-relaxed focus:outline-none" />
        )}
      </div>
    </Field>
  );
}

function ProductSelect({ value, onChange, label = 'Product' }) {
  const { data } = useLookups();
  return (
    <SelectInput label={label} value={value ?? ''} onChange={(v) => onChange(v ? Number(v) : null)} placeholder="— Choose a product —"
      options={(data?.products || []).map((p) => ({ value: p.id, label: `${p.name}${p.active ? '' : ' (inactive)'}` }))} />
  );
}

function TableEditor({ block, set }) {
  const headers = block.headers || [];
  const rows = block.rows || [];
  const cols = Math.max(headers.length, 1);
  const setCell = (r, c, v) => set({ rows: rows.map((row, i) => (i === r ? row.map((x, j) => (j === c ? v : x)) : row)) });
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[0.82rem]">
        <thead>
          <tr>{headers.map((h, c) => (
            <th key={c} className="p-0.5"><input className="input !py-1 font-semibold" placeholder={`Header ${c + 1}`} value={h} onChange={(e) => set({ headers: headers.map((x, j) => (j === c ? e.target.value : x)) })} /></th>
          ))}</tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r}>
              {Array.from({ length: cols }, (_, c) => (
                <td key={c} className="p-0.5"><input className="input !py-1" value={row[c] || ''} onChange={(e) => setCell(r, c, e.target.value)} /></td>
              ))}
              <td><button type="button" onClick={() => set({ rows: rows.filter((_, i) => i !== r) })} className="px-1 text-faint hover:text-accent-ink" aria-label="Remove row"><Icon name="close" size={14} /></button></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex gap-3 text-[0.78rem]">
        <button type="button" className="underline" onClick={() => set({ rows: [...rows, Array(cols).fill('')] })}>+ Row</button>
        <button type="button" className="underline" onClick={() => set({ headers: [...headers, ''], rows: rows.map((r) => [...r, '']) })}>+ Column</button>
        {cols > 1 && <button type="button" className="underline" onClick={() => set({ headers: headers.slice(0, -1), rows: rows.map((r) => r.slice(0, cols - 1)) })}>− Column</button>}
      </div>
    </div>
  );
}

function BlockFields({ block, set }) {
  switch (block.type) {
    case 'heading':
      return (
        <div className="grid grid-cols-[110px_1fr] gap-3">
          <SelectInput label="Level" value={block.level || 2} onChange={(v) => set({ level: Number(v) })} options={[{ value: 2, label: 'H2 section' }, { value: 3, label: 'H3 sub' }]} />
          <TextInput label="Heading" value={block.text} onChange={(v) => set({ text: v })} />
        </div>
      );
    case 'paragraph':
      return <RichText value={block.text || ''} onChange={(v) => set({ text: v })} placeholder="Write here. Select text and use B / I / Link to format." />;
    case 'list':
      return (
        <div className="grid gap-3">
          <SelectInput label="Style" value={block.style} onChange={(v) => set({ style: v })} options={[{ value: 'bullet', label: 'Bulleted' }, { value: 'number', label: 'Numbered' }]} />
          <ListInput value={block.items || []} onChange={(v) => set({ items: v })} />
        </div>
      );
    case 'quote':
      return (
        <div className="grid gap-3">
          <RichText label="Quote" value={block.text || ''} onChange={(v) => set({ text: v })} rows={2} />
          <TextInput label="Attribution" value={block.cite} onChange={(v) => set({ cite: v })} />
        </div>
      );
    case 'callout':
      return (
        <div className="grid gap-3">
          <div className="grid grid-cols-[140px_1fr] gap-3">
            <SelectInput label="Tone" value={block.tone} onChange={(v) => set({ tone: v })} options={[{ value: 'tip', label: 'Tip' }, { value: 'info', label: 'Info' }, { value: 'warning', label: 'Warning' }]} />
            <TextInput label="Title" value={block.title} onChange={(v) => set({ title: v })} />
          </div>
          <RichText value={block.text || ''} onChange={(v) => set({ text: v })} rows={2} />
        </div>
      );
    case 'editor_note':
      return <RichText value={block.text || ''} onChange={(v) => set({ text: v })} rows={2} />;
    case 'image':
      return (
        <div className="grid gap-3">
          <ImageField label="Image" value={block.url} onChange={(v) => set({ url: v })} alt={block.alt} onAltChange={(v) => set({ alt: v })} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Caption" value={block.caption} onChange={(v) => set({ caption: v })} />
            <TextInput label="Credit" value={block.credit} onChange={(v) => set({ credit: v })} />
          </div>
        </div>
      );
    case 'table':
      return <TableEditor block={block} set={set} />;
    case 'product':
      return (
        <div className="grid gap-3">
          <ProductSelect value={block.productId} onChange={(v) => set({ productId: v })} />
          <TextInput label="Label" value={block.label} onChange={(v) => set({ label: v })} placeholder="e.g. Best for small rooms" />
          <TextArea label="Note (optional — overrides the product summary here)" value={block.note} onChange={(v) => set({ note: v })} rows={2} />
        </div>
      );
    case 'comparison':
      return <ProductMultiPicker label="Products to compare" value={block.productIds || []} onChange={(v) => set({ productIds: v })} />;
    case 'proscons':
      return (
        <div className="grid gap-4 md:grid-cols-2">
          <ListInput label="Pros" value={block.pros || []} onChange={(v) => set({ pros: v })} />
          <ListInput label="Cons" value={block.cons || []} onChange={(v) => set({ cons: v })} />
        </div>
      );
    case 'verdict':
      return (
        <div className="grid gap-3">
          <TextInput label="Title" value={block.title} onChange={(v) => set({ title: v })} />
          <RichText label="Verdict" value={block.text || ''} onChange={(v) => set({ text: v })} rows={2} />
          <ProductSelect label="Linked product (optional)" value={block.productId} onChange={(v) => set({ productId: v })} />
        </div>
      );
    case 'cta':
      return (
        <div className="grid gap-3">
          <RichText label="Text" value={block.text || ''} onChange={(v) => set({ text: v })} rows={2} />
          <ProductSelect label="Product (uses its affiliate link)" value={block.productId} onChange={(v) => set({ productId: v })} />
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Button label" value={block.label} onChange={(v) => set({ label: v })} placeholder="See it on Amazon" />
            <TextInput label="Or link to URL" value={block.url} onChange={(v) => set({ url: v })} placeholder="/guides/…" />
          </div>
        </div>
      );
    case 'faq':
      return <FaqEditor value={block.items || []} onChange={(items) => set({ items })} />;
    case 'divider':
      return <hr className="border-line" />;
    default:
      return null;
  }
}

export function FaqEditor({ value = [], onChange }) {
  return (
    <div className="grid gap-3">
      {value.map((item, i) => (
        <div key={i} className="grid gap-2 rounded-sm border border-line bg-paper p-3">
          <div className="flex items-center gap-2">
            <input className="input font-medium" placeholder="Question" value={item.q} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))} />
            <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-faint hover:text-accent-ink" aria-label="Remove question"><Icon name="trash" size={16} /></button>
          </div>
          <textarea className="input" rows={2} placeholder="Answer" value={item.a} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))} />
        </div>
      ))}
      <button type="button" className="justify-self-start text-[0.82rem] underline" onClick={() => onChange([...value, { q: '', a: '' }])}>+ Add question</button>
    </div>
  );
}

function AddBlockMenu({ onAdd }) {
  const [open, setOpen] = useState(false);
  const groups = Object.entries(BLOCKS).reduce((acc, [type, def]) => ({ ...acc, [def.group]: [...(acc[def.group] || []), [type, def]] }), {});
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-center gap-2 rounded-sm border border-dashed border-line-strong py-3 text-[0.85rem] text-muted hover:border-ink hover:text-ink">
        <Icon name="plus" size={16} /> Add block
      </button>
      {open && (
        <div className="absolute inset-x-0 z-20 mt-1 grid gap-4 rounded-sm border border-line bg-card p-4 shadow-pop sm:grid-cols-3">
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <p className="eyebrow mb-2">{group}</p>
              {items.map(([type, def]) => (
                <button key={type} type="button" onClick={() => { onAdd(type); setOpen(false); }} className="block w-full rounded-xs px-2 py-1.5 text-left text-[0.85rem] hover:bg-paper">
                  {def.label}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BlockEditor({ value = [], onChange }) {
  // Seeded/imported blocks may lack ids; assign stable ones once so React keys don't churn.
  useEffect(() => {
    if (value.some((b) => !b.id)) onChange(value.map((b) => (b.id ? b : { ...b, id: newId() })));
  }, [value, onChange]);
  const blocks = value;
  const update = (i, patch) => onChange(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const add = (type, at = blocks.length) => {
    const next = [...blocks];
    next.splice(at, 0, { id: newId(), type, ...BLOCKS[type].make() });
    onChange(next);
  };
  return (
    <div className="grid gap-3">
      {blocks.map((block, i) => (
        <div key={block.id || i} className="group rounded-sm border border-line bg-card">
          <div className="flex items-center gap-2 border-b border-line px-3 py-1.5">
            <MoveButtons index={i} length={blocks.length} onMove={(a, b) => onChange(swap(blocks, a, b))} />
            <span className="font-mono text-[0.68rem] tracking-wider text-muted uppercase">{BLOCKS[block.type]?.label || block.type}</span>
            <button type="button" onClick={() => add('paragraph', i + 1)} className="ml-auto text-[0.75rem] text-faint opacity-0 group-hover:opacity-100 hover:text-ink">+ below</button>
            <button type="button" onClick={() => onChange(blocks.filter((_, j) => j !== i))} className="text-faint hover:text-accent-ink" aria-label="Delete block"><Icon name="trash" size={15} /></button>
          </div>
          <div className="p-3"><BlockFields block={block} set={(patch) => update(i, patch)} /></div>
        </div>
      ))}
      <AddBlockMenu onAdd={(type) => add(type)} />
    </div>
  );
}
