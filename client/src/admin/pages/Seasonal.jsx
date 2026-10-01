import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { clearCache } from '../../lib/useFetch.js';
import { sized } from '../../lib/image.js';
import { slugify } from '../../lib/format.js';
import Button, { ButtonLink } from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { PageHeader, Panel, Loading, LoadError, AdminTable, StatusPill, TextInput, TextArea, Toggle, useAdminData, useAction, useConfirm, useLookups } from '../components/ui.jsx';
import { ImageField } from '../components/MediaPicker.jsx';
import { SeoFields, PinterestFields } from '../components/MetaFields.jsx';
import SectionsEditor from '../components/SectionsEditor.jsx';

const SEASON_TYPES = ['trending', 'products', 'guides', 'categories', 'links', 'text', 'split_fashion', 'newsletter'];

export function SeasonalList() {
  const { data, error, loading, reload } = useAdminData('/admin/seasonal');
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="Seasonal pages" subtitle="Landing pages like /seasonal/halloween. Mark one as “current” to feature it on the homepage."
        actions={<ButtonLink to="/admin/seasonal/new" size="sm" icon="plus">New seasonal page</ButtonLink>} />
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <AdminTable rows={data} onRowClick={(s) => navigate(`/admin/seasonal/${s.id}`)} columns={[
          { key: 'title', label: 'Page', render: (s) => (
            <div className="flex items-center gap-3">
              {s.hero_image ? <img src={sized(s.hero_image, 96)} alt="" className="h-10 w-14 object-cover" /> : <span className="h-10 w-14 bg-paper-2" />}
              <div><p className="font-medium">{s.title}</p><p className="font-mono text-[0.7rem] text-muted">/seasonal/{s.slug}</p></div>
            </div>
          ) },
          { key: 'season', label: 'Season', render: (s) => (s.season_start ? `${new Date(s.season_start).toLocaleDateString()} – ${s.season_end ? new Date(s.season_end).toLocaleDateString() : '…'}` : '—') },
          { key: 'section_count', label: 'Sections', className: 'font-mono' },
          { key: 'status', label: 'Status', render: (s) => <span className="flex gap-1"><StatusPill status={s.active ? 'active' : 'inactive'} />{s.is_current && <StatusPill status="pinned" />}</span> },
        ]} />
      )}
    </>
  );
}

const EMPTY = { title: '', slug: '', eyebrow: '', hero_title: '', hero_subtitle: '', hero_image: '', season_start: null, season_end: null, is_current: false, active: true, seo: {}, sections: [], pinterest: null };
const dateOnly = (v) => (v ? String(v).slice(0, 10) : '');

export function SeasonalEditor() {
  const { id } = useParams();
  const isNew = id === 'new';
  const navigate = useNavigate();
  const confirm = useConfirm();
  const lookups = useLookups();
  const [run, busy] = useAction();
  const { data, error, loading, reload } = useAdminData(isNew ? null : `/admin/seasonal/${id}`);
  const [form, setForm] = useState({ ...EMPTY, sections: [{ type: 'trending', title: 'What people are searching', config: {}, enabled: true }, { type: 'products', title: 'Finds for the season', config: { source: 'tag', tag: '' }, enabled: true }] });

  useEffect(() => {
    if (data) setForm({ ...EMPTY, ...Object.fromEntries(Object.keys(EMPTY).map((k) => [k, data[k] ?? EMPTY[k]])),
      season_start: dateOnly(data.season_start), season_end: dateOnly(data.season_end),
      pinterest: data.pinterest ? { title: data.pinterest.title, description: data.pinterest.description, image_url: data.pinterest.image_url, destination_url: data.pinterest.destination_url, board: data.pinterest.board, status: data.pinterest.status } : null });
  }, [data]);
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    const body = { ...form, sections: form.sections.map((s) => ({ type: s.type, title: s.title || null, subtitle: s.subtitle || null, config: s.config || {}, enabled: s.enabled !== false })) };
    delete body._slug;
    if (!body.slug) delete body.slug;
    const saved = await run(() => (isNew ? api.post('/admin/seasonal', body) : api.put(`/admin/seasonal/${id}`, body)), 'Seasonal page saved');
    clearCache('/');
    lookups.reload();
    if (isNew) navigate(`/admin/seasonal/${saved.data.id}`, { replace: true });
    else reload();
  };

  if (!isNew && loading && !data) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;

  return (
    <>
      <PageHeader back="/admin/seasonal" title={isNew ? 'New seasonal page' : form.title}
        actions={<>
          {!isNew && <a href={`/seasonal/${form.slug}`} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line-strong px-3 text-[0.8rem] hover:border-ink"><Icon name="external" size={14} /> View</a>}
          <Button size="sm" loading={busy} onClick={save}>Save</Button>
        </>} />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid min-w-0 grid-cols-1 content-start gap-6">
          <Panel title="Hero">
            <div className="grid gap-4 md:grid-cols-2">
              <TextInput label="Name" value={form.title} onChange={(v) => setForm((f) => ({ ...f, title: v, ...(isNew && !f._slug ? { slug: slugify(v) } : {}) }))} />
              <TextInput label="Eyebrow" value={form.eyebrow} onChange={set('eyebrow')} placeholder="October" />
              <TextInput className="md:col-span-2" label="Hero headline" value={form.hero_title} onChange={set('hero_title')} />
              <TextArea className="md:col-span-2" label="Hero text" value={form.hero_subtitle} onChange={set('hero_subtitle')} rows={2} />
              <div className="md:col-span-2"><ImageField label="Hero image" value={form.hero_image} onChange={set('hero_image')} aspect="16/9" /></div>
            </div>
          </Panel>
          <div>
            <h2 className="mb-3 font-serif text-[1.6rem]">Sections</h2>
            <SectionsEditor value={form.sections} onChange={set('sections')} types={SEASON_TYPES} />
          </div>
        </div>
        <div className="grid min-w-0 grid-cols-1 content-start gap-5">
          <Panel title="Settings">
            <div className="grid gap-4">
              <TextInput label="URL slug" value={form.slug} onChange={(v) => setForm((f) => ({ ...f, slug: slugify(v), _slug: true }))} hint={`/seasonal/${form.slug || '…'}`} />
              <div className="grid grid-cols-2 gap-3">
                <TextInput label="Season starts" type="date" value={form.season_start || ''} onChange={set('season_start')} />
                <TextInput label="Season ends" type="date" value={form.season_end || ''} onChange={set('season_end')} />
              </div>
              <Toggle label="Current season" hint="Featured on the homepage's seasonal section. Only one page can be current." checked={form.is_current} onChange={set('is_current')} />
              <Toggle label="Active" checked={form.active} onChange={set('active')} />
              {!isNew && (
                <button className="justify-self-start text-[0.8rem] text-accent-ink underline" onClick={async () => {
                  if (!(await confirm({ title: 'Delete this seasonal page?', message: 'Its sections are deleted too. Products and guides are not affected.' }))) return;
                  await run(() => api.delete(`/admin/seasonal/${id}`), 'Deleted');
                  lookups.reload();
                  navigate('/admin/seasonal');
                }}>Delete page</button>
              )}
            </div>
          </Panel>
          <SeoFields value={form.seo} onChange={set('seo')} fallbackTitle={form.hero_title || form.title} fallbackDescription={form.hero_subtitle} path={`/seasonal/${form.slug}`} />
          <PinterestFields value={form.pinterest} onChange={set('pinterest')} fallbackTitle={form.hero_title} fallbackImage={form.hero_image} url={`${window.location.origin}/seasonal/${form.slug}`} />
        </div>
      </div>
    </>
  );
}
