import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { clearCache } from '../../lib/useFetch.js';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { PageHeader, Panel, Loading, LoadError, MoveButtons, swap, useAdminData, useAction } from '../components/ui.jsx';

const LOCATIONS = [
  ['header', 'Header', 'Main menu next to “Shop”. Shop always lists every category.'],
  ['footer_shop', 'Footer · Shop', ''],
  ['footer_guides', 'Footer · Guides', ''],
  ['footer_company', 'Footer · Company', ''],
  ['footer_legal', 'Footer · Legal', ''],
];

export default function Navigation() {
  const { data, error, loading, reload } = useAdminData('/admin/navigation');
  const [items, setItems] = useState(null);
  const [run, busy] = useAction();
  useEffect(() => { if (data) setItems(data.map(({ location, label, url, active }) => ({ location, label, url, active }))); }, [data]);

  if (loading && !items) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (!items) return null;

  const inLoc = (loc) => items.map((it, i) => ({ ...it, i })).filter((it) => it.location === loc);
  const update = (i, patch) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const save = async () => {
    await run(() => api.put('/admin/navigation', { items: items.filter((it) => it.label && it.url) }), 'Navigation saved');
    clearCache('/settings');
    reload();
  };

  return (
    <>
      <PageHeader title="Navigation" subtitle="Menus in the header and footer. Use site paths like /gadgets or full URLs." actions={<Button size="sm" loading={busy} onClick={save}>Save navigation</Button>} />
      <div className="grid gap-5 xl:grid-cols-2">
        {LOCATIONS.map(([loc, label, hint]) => {
          const list = inLoc(loc);
          return (
            <Panel key={loc} title={label} description={hint}>
              <div className="grid gap-2">
                {list.map((it, idx) => (
                  <div key={it.i} className="flex items-center gap-2">
                    <MoveButtons index={idx} length={list.length} onMove={(a, b) => setItems(swap(items, list[a].i, list[b].i))} />
                    <input className="input" placeholder="Label" value={it.label} onChange={(e) => update(it.i, { label: e.target.value })} />
                    <input className="input" placeholder="/path" value={it.url} onChange={(e) => update(it.i, { url: e.target.value })} />
                    <label className="flex items-center gap-1 text-[0.75rem]"><input type="checkbox" checked={it.active} onChange={(e) => update(it.i, { active: e.target.checked })} /> On</label>
                    <button type="button" onClick={() => setItems(items.filter((_, j) => j !== it.i))} className="text-faint hover:text-accent-ink" aria-label="Remove"><Icon name="close" size={15} /></button>
                  </div>
                ))}
                <button type="button" className="justify-self-start text-[0.8rem] underline" onClick={() => setItems([...items, { location: loc, label: '', url: '', active: true }])}>+ Add link</button>
              </div>
            </Panel>
          );
        })}
      </div>
    </>
  );
}
