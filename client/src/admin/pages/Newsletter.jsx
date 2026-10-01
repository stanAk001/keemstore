import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import { PageHeader, Loading, LoadError, AdminTable, StatusPill, Tabs, useAdminData, useAction, useConfirm } from '../components/ui.jsx';

export default function Newsletter() {
  const [status, setStatus] = useState('');
  const { data, error, loading, reload } = useAdminData(`/admin/newsletter?limit=500${status ? `&status=${status}` : ''}`);
  const [run] = useAction();
  const confirm = useConfirm();
  const { isAdmin } = useAuth();

  const exportCsv = async () => {
    const res = await run(() => api.get('/admin/newsletter/export', { responseType: 'blob' }));
    const url = URL.createObjectURL(res.data);
    const a = Object.assign(document.createElement('a'), { href: url, download: `subscribers-${new Date().toISOString().slice(0, 10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <PageHeader title="Newsletter" subtitle={<>Sign-ups from the site. Export them to your email tool. Copy and on/off are in <a className="underline" href="/admin/settings/site">Site settings</a>.</>}
        actions={<Button size="sm" variant="outline" icon="upload" onClick={exportCsv}>Export CSV</Button>} />
      <Tabs value={status} onChange={setStatus} tabs={[['', 'All'], ['subscribed', 'Subscribed'], ['unsubscribed', 'Unsubscribed']]} />
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <>
          <p className="mb-3 font-mono text-[0.75rem] text-muted">{data?.total ?? 0} total</p>
          <AdminTable rows={data?.items} empty="No sign-ups yet." columns={[
            { key: 'email', label: 'Email' },
            { key: 'source', label: 'Source', render: (s) => <span className="font-mono text-[0.75rem]">{s.source || '—'}</span> },
            { key: 'status', label: 'Status', render: (s) => <StatusPill status={s.status} /> },
            { key: 'created_at', label: 'Joined', render: (s) => new Date(s.created_at).toLocaleDateString() },
            { key: 'x', label: '', render: (s) => (
              <span className="flex gap-3 text-[0.78rem]">
                <button className="underline" onClick={async () => { await run(() => api.patch(`/admin/newsletter/${s.id}`, { status: s.status === 'subscribed' ? 'unsubscribed' : 'subscribed' }), 'Updated'); reload(); }}>
                  {s.status === 'subscribed' ? 'Unsubscribe' : 'Resubscribe'}
                </button>
                {isAdmin && <button className="text-accent-ink underline" onClick={async () => {
                  if (!(await confirm({ title: 'Delete subscriber?', message: `Permanently remove ${s.email}. Use this for data deletion requests.` }))) return;
                  await run(() => api.delete(`/admin/newsletter/${s.id}`), 'Deleted');
                  reload();
                }}>Delete</button>}
              </span>
            ) },
          ]} />
        </>
      )}
    </>
  );
}
