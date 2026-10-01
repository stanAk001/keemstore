// SEO + Pinterest field groups, shared by every content editor.
import { useState } from 'react';
import { TextInput, TextArea, SelectInput, Toggle, CopyButton, Panel } from './ui.jsx';
import { ImageField } from './MediaPicker.jsx';

export function SeoFields({ value = {}, onChange, fallbackTitle, fallbackDescription, path }) {
  const [advanced, setAdvanced] = useState(false);
  const set = (k) => (v) => onChange({ ...value, [k]: v });
  const title = value.title || fallbackTitle || '';
  const desc = value.description || fallbackDescription || '';
  return (
    <Panel title="Search & social" description="Leave blank to use the title and summary.">
      <div className="mb-5 rounded-xs border border-line bg-paper p-4">
        <p className="truncate text-[0.75rem] text-good">{window.location.origin}{path}</p>
        <p className="mt-0.5 truncate text-[1.05rem] text-[#1a0dab]">{title || 'Page title'}</p>
        <p className="mt-0.5 line-clamp-2 text-[0.82rem] text-ink-2">{desc || 'Meta description preview.'}</p>
      </div>
      <div className="grid gap-4">
        <TextInput label="SEO title" value={value.title} onChange={set('title')} counter={60} placeholder={fallbackTitle} />
        <TextArea label="Meta description" value={value.description} onChange={set('description')} counter={160} rows={2} placeholder={fallbackDescription} />
        <TextInput label="Focus keyword" value={value.focus_keyword} onChange={set('focus_keyword')} hint="For your reference when writing — not shown on the page." />
        <button type="button" onClick={() => setAdvanced((a) => !a)} className="justify-self-start text-[0.8rem] underline underline-offset-2">
          {advanced ? 'Hide' : 'Show'} canonical, Open Graph & X fields
        </button>
        {advanced && (
          <div className="grid gap-4 border-t border-line pt-4">
            <TextInput label="Canonical URL" value={value.canonical} onChange={set('canonical')} hint="Only if this content lives primarily at another URL." />
            <TextInput label="Open Graph title" value={value.og_title} onChange={set('og_title')} />
            <TextArea label="Open Graph description" value={value.og_description} onChange={set('og_description')} rows={2} />
            <ImageField label="Open Graph image" value={value.og_image} onChange={set('og_image')} hint="1200×630 works best." aspect="1200/630" />
            <TextInput label="X / Twitter title" value={value.twitter_title} onChange={set('twitter_title')} />
            <TextArea label="X / Twitter description" value={value.twitter_description} onChange={set('twitter_description')} rows={2} />
            <ImageField label="X / Twitter image" value={value.twitter_image} onChange={set('twitter_image')} aspect="1200/630" />
            <Toggle label="Hide from search engines (noindex)" checked={value.noindex} onChange={set('noindex')} />
          </div>
        )}
      </div>
    </Panel>
  );
}

export function PinterestFields({ value, onChange, fallbackTitle, fallbackImage, url }) {
  const v = value || {};
  const set = (k) => (x) => onChange({ ...v, [k]: x });
  return (
    <Panel title="Pinterest" description="Pin copy and a vertical image (2:3) for this content." actions={<CopyButton text={url} label="Copy URL" />}>
      <div className="grid gap-4">
        <div>
          <TextInput label="Pin title" value={v.title} onChange={set('title')} counter={100} placeholder={fallbackTitle} />
          <div className="mt-1.5"><CopyButton text={v.title || fallbackTitle} label="Copy title" /></div>
        </div>
        <div>
          <TextArea label="Pin description" value={v.description} onChange={set('description')} counter={500} rows={3} />
          <div className="mt-1.5"><CopyButton text={v.description} label="Copy description" /></div>
        </div>
        <ImageField label="Pin image" value={v.image_url} onChange={set('image_url')} aspect="2/3" hint={!v.image_url && fallbackImage ? 'Falls back to the hero image.' : '1000×1500 recommended.'} />
        <TextInput label="Destination URL" value={v.destination_url} onChange={set('destination_url')} placeholder={url} />
        <div className="grid grid-cols-2 gap-4">
          <TextInput label="Board" value={v.board} onChange={set('board')} />
          <SelectInput label="Status" value={v.status || 'draft'} onChange={set('status')} options={[
            { value: 'draft', label: 'Draft' }, { value: 'ready', label: 'Ready to pin' }, { value: 'pinned', label: 'Pinned' },
          ]} />
        </div>
      </div>
    </Panel>
  );
}
