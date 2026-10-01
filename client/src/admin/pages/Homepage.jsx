import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { clearCache } from '../../lib/useFetch.js';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { PageHeader, Loading, LoadError, useAdminData, useAction } from '../components/ui.jsx';
import SectionsEditor from '../components/SectionsEditor.jsx';

const clean = (s) => ({ key: s.key, type: s.type, title: s.title || null, subtitle: s.subtitle || null, config: s.config || {}, enabled: s.enabled !== false });

export default function Homepage() {
  const { data, error, loading, reload } = useAdminData('/admin/homepage');
  const [sections, setSections] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [run, busy] = useAction();

  useEffect(() => { if (data) { setSections(data.sections); setDirty(false); } }, [data]);

  const save = async () => {
    await run(() => api.put('/admin/homepage', { sections: sections.map(clean) }), 'Homepage saved');
    clearCache('/homepage');
    reload();
  };

  if (loading && !data) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Homepage" subtitle="Turn sections on or off, reorder them, and choose what each shows. Layouts are fixed so the site stays consistent."
        actions={<>
          <a href="/" target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1.5 rounded-sm border border-line-strong px-3 text-[0.8rem] hover:border-ink"><Icon name="external" size={14} /> View homepage</a>
          <Button size="sm" loading={busy} disabled={!dirty} onClick={save}>{dirty ? 'Save changes' : 'Saved'}</Button>
        </>} />
      <p className="mb-4 text-[0.8rem] text-muted">The announcement bar is edited in <a href="/admin/settings/site" className="underline">Site settings</a>. Sections with nothing to show (e.g. no products) are skipped automatically.</p>
      <SectionsEditor value={sections} onChange={(v) => { setSections(v); setDirty(true); }} />
    </>
  );
}
