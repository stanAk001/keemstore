// Editor for predefined, orderable page sections (homepage + seasonal pages).
// Editors choose content and order; layout per type is fixed by design.
import { useState } from 'react';
import Icon from '../../components/ui/Icon.jsx';
import { TextInput, TextArea, SelectInput, Toggle, MoveButtons, swap, useLookups, Field } from './ui.jsx';
import { ImageField } from './MediaPicker.jsx';
import { MOTION_SCENES } from '../../components/motion/index.jsx';
import { ProductMultiPicker, GuideMultiPicker, CategoryMultiPicker, TrendMultiPicker, CategorySelect, GuideSelect } from './Pickers.jsx';

export const SECTION_TYPES = {
  hero: { label: 'Hero', hint: 'Headline, calls to action and an image collage.' },
  trending: { label: 'Trending now', hint: 'Numbered list of current trends.' },
  categories: { label: 'Categories', hint: 'Image tiles. Five categories gives the editorial large-tile layout.' },
  featured_guide: { label: 'Featured guide', hint: 'One large guide feature.' },
  products: { label: 'Products', hint: 'Grid, horizontal rail or numbered dark list.' },
  guides: { label: 'Guides', hint: 'Grid of chosen guides or a category’s guides.' },
  latest_guides: { label: 'Latest guides', hint: 'Newest published guides.' },
  split_fashion: { label: 'Split panels (fashion)', hint: 'Two large image panels with products.' },
  creator: { label: 'Creator & work', hint: 'Category tiles and a product row.' },
  seasonal: { label: 'Seasonal feature', hint: 'Highlights the current (or chosen) seasonal page.' },
  newsletter: { label: 'Newsletter', hint: 'Copy comes from Newsletter settings unless you override it here.' },
  links: { label: 'Link pills', hint: 'e.g. Related searches.' },
  text: { label: 'Text', hint: 'A short paragraph.' },
};

function LinkList({ value = [], onChange }) {
  return (
    <div className="grid gap-2">
      {value.map((l, i) => (
        <div key={i} className="flex gap-2">
          <input className="input" placeholder="Label" value={l.label} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
          <input className="input" placeholder="/path or https://" value={l.url} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
          <button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} className="text-faint hover:text-accent-ink" aria-label="Remove link"><Icon name="close" size={15} /></button>
        </div>
      ))}
      <button type="button" className="justify-self-start text-[0.8rem] underline" onClick={() => onChange([...value, { label: '', url: '' }])}>+ Add link</button>
    </div>
  );
}

function ProductsConfig({ c, set }) {
  const { data } = useLookups();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <SelectInput label="Layout" value={c.variant || 'grid'} onChange={set('variant')} options={[
        { value: 'grid', label: 'Grid' }, { value: 'rail', label: 'Horizontal rail' }, { value: 'numbered', label: 'Numbered dark list' },
      ]} />
      <SelectInput label="Products from" value={c.source || 'featured'} onChange={set('source')} options={[
        { value: 'featured', label: "Editor's picks (featured)" }, { value: 'manual', label: 'Hand-picked' }, { value: 'collection', label: 'A collection' },
        { value: 'category', label: 'A category' }, { value: 'tag', label: 'A tag' }, { value: 'under_price', label: 'Under a price' }, { value: 'latest', label: 'Newest' },
      ]} />
      {c.source === 'manual' && <div className="md:col-span-2"><ProductMultiPicker value={c.product_ids || []} onChange={set('product_ids')} /></div>}
      {c.source === 'collection' && (
        <SelectInput label="Collection" value={c.collection_id ?? ''} onChange={(v) => set('collection_id')(v ? Number(v) : null)} placeholder="— Choose —"
          options={(data?.collections || []).map((x) => ({ value: x.id, label: x.title }))} />
      )}
      {c.source === 'category' && <CategorySelect value={c.category_id} onChange={set('category_id')} />}
      {c.source === 'tag' && <TextInput label="Tag" value={c.tag} onChange={set('tag')} placeholder="lazy" />}
      {c.source === 'under_price' && <TextInput label="Max price ($)" type="number" value={c.max_price} onChange={(v) => set('max_price')(Number(v))} />}
      {c.source !== 'manual' && <TextInput label="How many" type="number" min="1" max="24" value={c.limit ?? 8} onChange={(v) => set('limit')(Number(v))} />}
      <TextInput label="“See all” link label" value={c.link?.label} onChange={(v) => set('link')({ ...(c.link || {}), label: v })} />
      <TextInput label="“See all” link URL" value={c.link?.url} onChange={(v) => set('link')({ ...(c.link || {}), url: v })} placeholder="/lazy-but-useful" />
    </div>
  );
}

function HeroConfig({ c, set }) {
  const images = c.images || [];
  const setImg = (i, patch) => set('images')(images.map((im, j) => (j === i ? { ...im, ...patch } : im)));
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput label="Eyebrow" value={c.eyebrow} onChange={set('eyebrow')} />
        <TextInput label="Headline" value={c.headline} onChange={set('headline')} hint="*Asterisks* = accent italic. Put {rotate} where the cycling word should go." />
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <TextInput
          label="Rotating words"
          value={Array.isArray(c.rotating_words) ? c.rotating_words.join(', ') : c.rotating_words}
          onChange={(v) => set('rotating_words')(v.split(',').map((w) => w.trimStart()))}
          placeholder="keeping, gifting, owning"
          hint="Comma separated. They take turns in place of {rotate}."
        />
        <div className="self-end pb-1">
          <Toggle label="Trending ticker under the hero" hint="A scrolling strip of current trends." checked={c.show_ticker !== false} onChange={set('show_ticker')} />
        </div>
      </div>
      <TextArea label="Supporting text" value={c.subtext} onChange={set('subtext')} rows={2} />
      <div className="grid gap-3 md:grid-cols-4">
        <TextInput label="Primary button" value={c.primary_cta?.label} onChange={(v) => set('primary_cta')({ ...(c.primary_cta || {}), label: v })} />
        <TextInput label="Primary URL" value={c.primary_cta?.url} onChange={(v) => set('primary_cta')({ ...(c.primary_cta || {}), url: v })} />
        <TextInput label="Secondary button" value={c.secondary_cta?.label} onChange={(v) => set('secondary_cta')({ ...(c.secondary_cta || {}), label: v })} />
        <TextInput label="Secondary URL" value={c.secondary_cta?.url} onChange={(v) => set('secondary_cta')({ ...(c.secondary_cta || {}), url: v })} />
      </div>
      <Field label="Collage tiles (up to 5 — the first is the largest). Each can be an image, a video link, or a live scene.">
        <div className="grid gap-3">
          {images.map((im, i) => (
            <div key={i} className="flex gap-3 rounded-sm border border-line bg-paper p-3">
              <MoveButtons index={i} length={images.length} onMove={(a, b) => set('images')(swap(images, a, b))} />
              <div className="grid flex-1 gap-2">
                <ImageField label="" value={im.url} onChange={(v) => setImg(i, { url: v })} alt={im.alt} onAltChange={(v) => setImg(i, { alt: v })} />
                <div className="grid grid-cols-2 gap-2">
                  <input className="input" placeholder="Caption label, e.g. Bedroom" value={im.label || ''} onChange={(e) => setImg(i, { label: e.target.value })} />
                  <input className="input" placeholder="Link, e.g. /home/bedroom" value={im.href || ''} onChange={(e) => setImg(i, { href: e.target.value })} />
                </div>
                <select className="input" value={im.motion || ''} onChange={(e) => setImg(i, { motion: e.target.value || undefined })} aria-label="Live motion scene">
                  <option value="">Show the image/video above</option>
                  {Object.entries(MOTION_SCENES).map(([k, s]) => <option key={k} value={k}>Live scene: {s.label}</option>)}
                </select>
              </div>
              <button type="button" onClick={() => set('images')(images.filter((_, j) => j !== i))} className="self-start text-faint hover:text-accent-ink" aria-label="Remove image"><Icon name="trash" size={15} /></button>
            </div>
          ))}
          {images.length < 5 && <button type="button" className="justify-self-start text-[0.8rem] underline" onClick={() => set('images')([...images, { url: '', alt: '', label: '', href: '' }])}>+ Add image</button>}
        </div>
      </Field>
    </div>
  );
}

function SplitConfig({ c, set }) {
  const panels = c.panels?.length ? c.panels : [{}, {}];
  const setPanel = (i, patch) => set('panels')(panels.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {panels.slice(0, 2).map((p, i) => (
        <div key={i} className="grid gap-3 rounded-sm border border-line bg-paper p-3">
          <p className="eyebrow">Panel {i + 1}</p>
          <TextInput label="Title" value={p.title} onChange={(v) => setPanel(i, { title: v })} />
          <TextInput label="Subtitle" value={p.subtitle} onChange={(v) => setPanel(i, { subtitle: v })} />
          <CategorySelect label="Category (link + products)" value={p.category_id} onChange={(v) => setPanel(i, { category_id: v })} />
          <ImageField label="Image" value={p.image} onChange={(v) => setPanel(i, { image: v })} aspect="4/5" />
        </div>
      ))}
      <TextInput label="Products per panel" type="number" min="0" max="6" value={c.per_panel ?? 3} onChange={(v) => set('per_panel')(Number(v))} />
    </div>
  );
}

function ConfigFields({ section, set }) {
  const c = section.config || {};
  const { data } = useLookups();
  switch (section.type) {
    case 'hero': return <HeroConfig c={c} set={set} />;
    case 'products': return <ProductsConfig c={c} set={set} />;
    case 'split_fashion': return <SplitConfig c={c} set={set} />;
    case 'trending':
      return <TrendMultiPicker label="Specific trends (leave empty for all current trends)" value={c.trend_ids || []} onChange={set('trend_ids')} />;
    case 'categories':
      return <CategoryMultiPicker label="Categories (leave empty for featured categories)" value={c.category_ids || []} onChange={set('category_ids')} />;
    case 'featured_guide':
      return <GuideSelect label="Guide (empty = latest featured guide)" value={c.guide_id} onChange={set('guide_id')} placeholder="— Latest featured —" />;
    case 'guides':
      return (
        <div className="grid gap-4">
          <GuideMultiPicker label="Hand-picked guides" value={c.guide_ids || []} onChange={set('guide_ids')} />
          <CategoryMultiPicker label="…or guides from these categories" value={c.category_ids || []} onChange={set('category_ids')} />
          <TextInput label="How many" type="number" value={c.limit ?? 3} onChange={(v) => set('limit')(Number(v))} />
        </div>
      );
    case 'latest_guides':
      return <TextInput label="How many" type="number" value={c.limit ?? 6} onChange={(v) => set('limit')(Number(v))} />;
    case 'creator':
      return (
        <div className="grid gap-4">
          <CategoryMultiPicker label="Category tiles" value={c.category_ids || []} onChange={set('category_ids')} />
          <ProductMultiPicker label="Products (leave empty to pull from those categories)" value={c.product_ids || []} onChange={set('product_ids')} />
        </div>
      );
    case 'seasonal':
      return (
        <div className="grid gap-4 md:grid-cols-3">
          <SelectInput label="Seasonal page" value={c.seasonal_page_id ?? ''} onChange={(v) => set('seasonal_page_id')(v ? Number(v) : null)} placeholder="— Current season —"
            options={(data?.seasonal || []).map((s) => ({ value: s.id, label: s.title }))} />
          <TextInput label="Product tag" value={c.tag} onChange={set('tag')} hint="Defaults to the page slug, e.g. halloween." />
          <TextInput label="How many products" type="number" value={c.limit ?? 4} onChange={(v) => set('limit')(Number(v))} />
        </div>
      );
    case 'links':
      return <LinkList value={c.links || []} onChange={set('links')} />;
    case 'text':
      return <TextArea label="Text" value={c.body} onChange={set('body')} rows={3} hint="Supports **bold**, *italic* and [links](/path)." />;
    default:
      return <p className="text-[0.8rem] text-muted">No options for this section.</p>;
  }
}

export default function SectionsEditor({ value = [], onChange, types = Object.keys(SECTION_TYPES) }) {
  const [adding, setAdding] = useState('');
  const [open, setOpen] = useState(null);
  const update = (i, patch) => onChange(value.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const setConfig = (i) => (k) => (v) => update(i, { config: { ...(value[i].config || {}), [k]: v } });

  return (
    <div className="grid gap-3">
      {value.map((s, i) => {
        const expanded = open === i;
        return (
          <div key={s.key || s.id || i} className={`rounded-sm border bg-card ${s.enabled === false ? 'border-dashed border-line-strong opacity-70' : 'border-line'}`}>
            <div className="flex items-center gap-3 px-3 py-2.5">
              <MoveButtons index={i} length={value.length} onMove={(a, b) => { onChange(swap(value, a, b)); setOpen(null); }} />
              <span className="w-6 font-mono text-[0.72rem] text-muted">{String(i + 1).padStart(2, '0')}</span>
              <button type="button" onClick={() => setOpen(expanded ? null : i)} className="min-w-0 flex-1 text-left">
                <p className="truncate font-medium">{s.title || SECTION_TYPES[s.type]?.label}</p>
                <p className="font-mono text-[0.68rem] text-muted uppercase">{SECTION_TYPES[s.type]?.label}{s.config?.variant ? ` · ${s.config.variant}` : ''}</p>
              </button>
              <Toggle label={s.enabled === false ? 'Hidden' : 'Visible'} checked={s.enabled !== false} onChange={(v) => update(i, { enabled: v })} />
              <button type="button" onClick={() => setOpen(expanded ? null : i)} className="p-1 text-faint hover:text-ink" aria-label="Edit section"><Icon name={expanded ? 'chevronUp' : 'edit'} size={16} /></button>
              <button type="button" onClick={() => { onChange(value.filter((_, j) => j !== i)); setOpen(null); }} className="p-1 text-faint hover:text-accent-ink" aria-label="Remove section"><Icon name="trash" size={15} /></button>
            </div>
            {expanded && (
              <div className="grid gap-4 border-t border-line p-4">
                <p className="text-[0.78rem] text-muted">{SECTION_TYPES[s.type]?.hint}</p>
                {s.type !== 'hero' && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <TextInput label="Section title" value={s.title} onChange={(v) => update(i, { title: v })} />
                    <TextInput label="Subtitle" value={s.subtitle} onChange={(v) => update(i, { subtitle: v })} />
                  </div>
                )}
                <ConfigFields section={s} set={setConfig(i)} />
              </div>
            )}
          </div>
        );
      })}
      <div className="flex gap-2">
        <select className="input max-w-xs" value={adding} onChange={(e) => setAdding(e.target.value)}>
          <option value="">Add a section…</option>
          {types.map((t) => <option key={t} value={t}>{SECTION_TYPES[t].label}</option>)}
        </select>
        <button type="button" disabled={!adding} onClick={() => { onChange([...value, { type: adding, title: '', subtitle: '', config: {}, enabled: true }]); setOpen(value.length); setAdding(''); }}
          className="rounded-sm bg-ink px-4 text-[0.82rem] text-paper disabled:opacity-40">Add</button>
      </div>
    </div>
  );
}
