import { useRef, useState } from 'react';
import { api, errorMessage } from '../../lib/api.js';
import { sized } from '../../lib/image.js';
import { isVideo, posterFor } from '../../lib/media.js';
import Icon from '../../components/ui/Icon.jsx';
import Button from '../../components/ui/Button.jsx';
import { AdminModal, Field, useAdminData, useLookups, useToast } from './ui.jsx';

const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime';

/** Small preview that works for images and videos. */
export function MediaThumb({ url, className = '' }) {
  if (!url) return null;
  if (isVideo(url)) {
    const poster = posterFor(url, 300);
    return (
      <span className={`relative block h-full w-full ${className}`}>
        <video src={url} poster={poster} muted playsInline preload="metadata" className="absolute inset-0 h-full w-full object-cover" />
        <span className="absolute right-1 bottom-1 rounded-xs bg-ink/80 px-1 font-mono text-[0.55rem] tracking-wider text-paper uppercase">Video</span>
      </span>
    );
  }
  return <img src={sized(url, 300)} alt="" className={`absolute inset-0 h-full w-full object-cover ${className}`} />;
}

export function UploadButton({ onUploaded, label = 'Upload', disabled }) {
  const input = useRef(null);
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const upload = async (file) => {
    if (!file) return;
    const video = file.type.startsWith('video/');
    if (file.size > (video ? 60 : 8) * 1024 * 1024) return toast(video ? 'Videos must be under 60 MB' : 'Images must be under 8 MB', 'error');
    const body = new FormData();
    body.append('file', file);
    setBusy(true);
    try {
      const { data } = await api.post('/admin/media/upload', body, { timeout: 180000 });
      toast(video ? 'Video uploaded' : 'Image uploaded');
      onUploaded(data);
    } catch (err) {
      toast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
      if (input.current) input.current.value = '';
    }
  };
  return (
    <>
      <input ref={input} type="file" accept={ACCEPT} className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
      <Button type="button" size="sm" icon="upload" loading={busy} disabled={disabled} onClick={() => input.current?.click()}>{busy ? 'Uploading…' : label}</Button>
    </>
  );
}

/** Copy a pasted URL into the media library (and Cloudinary, when configured). */
export function useImportUrl() {
  const toast = useToast();
  const [state, setState] = useState({ busy: false, note: '' });
  const run = async (url) => {
    if (!/^https:\/\//i.test(url)) return null;
    setState({ busy: true, note: 'Copying into your media library…' });
    try {
      const { data } = await api.post('/admin/media/external', { url }, { timeout: 180000 });
      setState({
        busy: false,
        note: data.uploaded
          ? 'Saved to Cloudinary ✓ — now served from your own account.'
          : 'Added to your library. Cloudinary isn’t set up, so it still loads from the original site.',
      });
      return data;
    } catch (err) {
      setState({ busy: false, note: '' });
      toast(errorMessage(err), 'error');
      return null;
    }
  };
  return [run, state];
}

/** Modal to choose from the library, upload a file, or add by URL. */
export function MediaPicker({ open, onClose, onSelect }) {
  const [q, setQ] = useState('');
  const [url, setUrl] = useState('');
  const { data, reload } = useAdminData(open ? `/admin/media?limit=60${q ? `&q=${encodeURIComponent(q)}` : ''}` : null);
  const [importUrl, importing] = useImportUrl();

  const addUrl = async () => {
    const item = await importUrl(url);
    if (item) {
      setUrl('');
      onSelect(item);
    }
  };

  return (
    <AdminModal open={open} onClose={onClose} title="Choose an image or video" wide>
      <div className="flex flex-wrap items-end gap-3 border-b border-line pb-4">
        <input className="input max-w-xs" placeholder="Search library…" value={q} onChange={(e) => setQ(e.target.value)} />
        <UploadButton disabled={data && !data.cloudinary} onUploaded={(item) => { reload(); onSelect(item); }} />
        {data && !data.cloudinary && <span className="text-[0.75rem] text-muted">Uploads need Cloudinary configured on the server.</span>}
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {(data?.items || []).map((m) => (
          <button key={m.id} type="button" onClick={() => onSelect(m)} className="group relative aspect-square overflow-hidden bg-paper-2 ring-ink hover:ring-2">
            <MediaThumb url={m.url} />
            <span className="absolute inset-x-0 bottom-0 truncate bg-ink/70 px-1.5 py-0.5 text-left text-[0.65rem] text-paper opacity-0 group-hover:opacity-100">{m.filename}</span>
          </button>
        ))}
        {data && !data.items.length && <p className="col-span-full py-6 text-center text-sm text-muted">Nothing here yet. Upload a file or paste a link below.</p>}
      </div>
      <Field label="Or paste an image or video link" hint={importing.note || 'Must be an https:// link you have the right to use. It’s copied into your Cloudinary account automatically.'} className="mt-6 border-t border-line pt-4">
        <div className="flex gap-2">
          <input className="input" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addUrl())} />
          <Button type="button" size="sm" variant="subtle" className="!h-[38px]" loading={importing.busy} disabled={!/^https:\/\//.test(url)} onClick={addUrl}>Add</Button>
        </div>
      </Field>
    </AdminModal>
  );
}

/**
 * Image/video input with preview. Pasting a link copies the file into the
 * media library (and Cloudinary) automatically, then stores the new URL.
 */
export function ImageField({ label = 'Image', hint, value, onChange, alt, onAltChange, aspect = '4/3' }) {
  const [open, setOpen] = useState(false);
  const [importUrl, importing] = useImportUrl();
  const lookups = useLookups();
  const cloudName = lookups.data?.cloudinary;

  const importAndUse = async (raw) => {
    const item = await importUrl(raw.trim());
    if (item) {
      onChange(item.url);
      if (onAltChange && item.alt && !alt) onAltChange(item.alt);
    }
  };
  const external = value && /^https:\/\//.test(value) && !/res\.cloudinary\.com\//.test(value);

  return (
    <Field label={label} hint={importing.note || hint}>
      <div className="flex items-start gap-3">
        <button type="button" onClick={() => setOpen(true)} className="relative w-28 shrink-0 overflow-hidden rounded-xs border border-line bg-paper-2 hover:border-ink" style={{ aspectRatio: aspect }}>
          {value ? <MediaThumb url={value} /> : <Icon name="image" size={22} className="absolute inset-0 m-auto text-faint" />}
          {importing.busy && <span className="absolute inset-0 flex items-center justify-center bg-paper/80"><span className="h-4 w-4 animate-spin rounded-full border-2 border-ink border-r-transparent" /></span>}
        </button>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <input
            className="input text-[0.78rem]"
            placeholder="Paste an image or video link — it uploads automatically"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (/^https:\/\//i.test(text.trim())) {
                e.preventDefault();
                onChange(text.trim());
                importAndUse(text);
              }
            }}
          />
          {onAltChange && <input className="input text-[0.78rem]" placeholder="Alt text (describe the image)" value={alt || ''} onChange={(e) => onAltChange(e.target.value)} />}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="subtle" onClick={() => setOpen(true)}>Choose…</Button>
            {external && cloudName && !importing.busy && (
              <Button type="button" size="sm" variant="ghost" onClick={() => importAndUse(value)}>Save to Cloudinary</Button>
            )}
            {value && <Button type="button" size="sm" variant="ghost" onClick={() => onChange('')}>Remove</Button>}
          </div>
        </div>
      </div>
      <MediaPicker open={open} onClose={() => setOpen(false)} onSelect={(m) => { onChange(m.url); if (onAltChange && m.alt && !alt) onAltChange(m.alt); setOpen(false); }} />
    </Field>
  );
}
