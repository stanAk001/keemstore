import { useState } from 'react';
import { api } from '../../lib/api.js';
import { sized } from '../../lib/image.js';
import Button from '../../components/ui/Button.jsx';
import { PageHeader, Loading, LoadError, AdminModal, TextInput, TextArea, CopyButton, useAdminData, useAction, useConfirm, useToast } from '../components/ui.jsx';
import { UploadButton, MediaPicker, MediaThumb } from '../components/MediaPicker.jsx';
import { isVideo } from '../../lib/media.js';

export default function Media() {
  const [q, setQ] = useState('');
  const { data, error, loading, reload } = useAdminData(`/admin/media?limit=120${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  const [selected, setSelected] = useState(null);
  const [usage, setUsage] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const toast = useToast();

  const open = async (m) => {
    setSelected({ ...m });
    setUsage(null);
    const { data: u } = await api.get(`/admin/media/${m.id}/usage`);
    setUsage(u);
  };

  const save = async () => {
    await run(() => api.put(`/admin/media/${selected.id}`, { alt: selected.alt, caption: selected.caption, credit: selected.credit, filename: selected.filename }), 'Saved');
    reload();
  };

  const remove = async () => {
    const msg = usage?.length ? `It's used in ${usage.length} place(s). Those images will break.` : 'This cannot be undone.';
    if (!(await confirm({ title: 'Delete this image?', message: msg }))) return;
    await run(() => api.delete(`/admin/media/${selected.id}${usage?.length ? '?force=true' : ''}`), 'Image deleted');
    setSelected(null);
    reload();
  };

  return (
    <>
      <PageHeader title="Media library" subtitle="Images and videos. Uploads and pasted links are stored in Cloudinary and served resized in modern formats."
        actions={<>
          <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>Add from link</Button>
          <UploadButton disabled={data && !data.cloudinary} onUploaded={() => reload()} />
        </>} />
      {data && !data.cloudinary && (
        <p className="mb-4 rounded-sm border-l-2 border-accent bg-accent-soft/50 px-4 py-3 text-sm">
          Uploads are off until Cloudinary is configured (<code>CLOUDINARY_CLOUD_NAME</code>, <code>CLOUDINARY_API_KEY</code>, <code>CLOUDINARY_API_SECRET</code> on the server). You can still add images by URL.
        </p>
      )}
      <input className="input mb-4 max-w-sm" placeholder="Search by filename, alt or caption…" value={q} onChange={(e) => setQ(e.target.value)} />
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
          {(data?.items || []).map((m) => (
            <button key={m.id} onClick={() => open(m)} className="group text-left">
              <div className="aspect-square overflow-hidden bg-paper-2 ring-ink group-hover:ring-2">
                <span className="relative block h-full w-full"><MediaThumb url={m.url} /></span>
              </div>
              <p className="mt-1 truncate text-[0.72rem]">{m.filename}</p>
              {!m.alt && m.type !== 'video' && <p className="text-[0.66rem] text-accent-ink">No alt text</p>}
            </button>
          ))}
          {data && !data.items.length && <p className="col-span-full rounded-sm border border-dashed border-line-strong p-10 text-center text-sm text-muted">No images yet.</p>}
        </div>
      )}

      <MediaPicker open={addOpen} onClose={() => setAddOpen(false)} onSelect={() => { setAddOpen(false); reload(); toast('Image added'); }} />

      <AdminModal open={Boolean(selected)} onClose={() => setSelected(null)} title="Image details" wide
        footer={<><Button variant="ghost" size="sm" className="mr-auto !text-accent-ink" onClick={remove}>Delete</Button><Button size="sm" loading={busy} onClick={save}>Save</Button></>}>
        {selected && (
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              {isVideo(selected.url) ? <video src={selected.url} controls muted playsInline className="w-full bg-paper-2" /> : <img src={sized(selected.url, 800)} alt={selected.alt || ''} className="w-full bg-paper-2" />}
              <div className="mt-2 flex items-center gap-2 text-[0.75rem]">
                <code className="min-w-0 flex-1 truncate">{selected.url}</code><CopyButton text={selected.url} label="Copy URL" />
              </div>
              <p className="mt-2 text-[0.75rem] text-muted">
                {selected.width ? `${selected.width}×${selected.height} · ` : ''}{selected.format ? `${selected.format} · ` : ''}{selected.bytes ? `${Math.round(selected.bytes / 1024)} KB · ` : ''}added {new Date(selected.created_at).toLocaleDateString()}
                {selected.public_id ? ' · Cloudinary' : ' · external URL'}
              </p>
            </div>
            <div className="grid content-start gap-4">
              <TextInput label="Filename" value={selected.filename} onChange={(v) => setSelected((s) => ({ ...s, filename: v }))} />
              <TextArea label="Alt text" hint="Describe the image for screen readers and search." value={selected.alt} onChange={(v) => setSelected((s) => ({ ...s, alt: v }))} rows={2} />
              <TextInput label="Caption" value={selected.caption} onChange={(v) => setSelected((s) => ({ ...s, caption: v }))} />
              <TextInput label="Credit" value={selected.credit} onChange={(v) => setSelected((s) => ({ ...s, credit: v }))} />
              <div>
                <p className="label">Where it's used</p>
                {!usage ? <p className="text-[0.8rem] text-muted">Checking…</p> : usage.length ? (
                  <ul className="space-y-1 text-[0.8rem]">{usage.map((u, i) => <li key={i}><span className="font-mono text-[0.7rem] text-muted uppercase">{u.type.replace('_', ' ')}</span> {u.title}</li>)}</ul>
                ) : <p className="text-[0.8rem] text-muted">Not used anywhere yet.</p>}
              </div>
            </div>
          </div>
        )}
      </AdminModal>
    </>
  );
}
