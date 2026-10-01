import { useState } from 'react';
import { api } from '../../lib/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import Button from '../../components/ui/Button.jsx';
import { PageHeader, Loading, LoadError, AdminModal, AdminTable, StatusPill, TextInput, TextArea, SelectInput, Toggle, Tabs, useAdminData, useAction, useConfirm, useLookups } from '../components/ui.jsx';

const ROLES = [{ value: 'admin', label: 'Admin — everything' }, { value: 'editor', label: 'Editor — content, media, analytics' }, { value: 'user', label: 'Reader — no admin access' }];

export default function Users() {
  const [scope, setScope] = useState('staff');
  const { data, error, loading, reload } = useAdminData(`/admin/users${scope === 'all' ? '?scope=all' : ''}`);
  const { user: me } = useAuth();
  const lookups = useLookups();
  const [editing, setEditing] = useState(null);
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const set = (k) => (v) => setEditing((e) => ({ ...e, [k]: v }));

  const save = async () => {
    const { id, email, password, display_name, role, bio, active } = editing;
    if (id) await run(() => api.put(`/admin/users/${id}`, { email, display_name, role, bio, active, ...(password ? { password } : {}) }), 'User updated');
    else await run(() => api.post('/admin/users', { email, password, display_name, role, bio }), 'User created');
    setEditing(null);
    reload();
    lookups.reload();
  };

  return (
    <>
      <PageHeader title="Users" subtitle="Admins manage everything. Editors can write and publish but can't change settings or users."
        actions={<Button size="sm" icon="plus" onClick={() => setEditing({ email: '', password: '', display_name: '', role: 'editor', bio: '', active: true })}>Add user</Button>} />
      <Tabs value={scope} onChange={setScope} tabs={[['staff', 'Staff'], ['all', 'Everyone']]} />
      {error && <LoadError error={error} onRetry={reload} />}
      {loading && !data ? <Loading /> : (
        <AdminTable rows={data} onRowClick={(u) => setEditing({ ...u, password: '' })} columns={[
          { key: 'display_name', label: 'Name', render: (u) => <span className="font-medium">{u.display_name}{u.id === me.id && <span className="ml-2 text-[0.72rem] text-muted">(you)</span>}</span> },
          { key: 'email', label: 'Email' },
          { key: 'role', label: 'Role', render: (u) => <span className="font-mono text-[0.75rem] uppercase">{u.role}</span> },
          { key: 'active', label: 'Status', render: (u) => <StatusPill status={u.active ? 'active' : 'inactive'} /> },
          { key: 'last_login_at', label: 'Last sign-in', render: (u) => (u.last_login_at ? new Date(u.last_login_at).toLocaleDateString() : '—') },
        ]} />
      )}
      <AdminModal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.display_name}` : 'Add user'}
        footer={<>
          {editing?.id && editing.id !== me.id && (
            <Button variant="ghost" size="sm" className="mr-auto !text-accent-ink" onClick={async () => {
              if (!(await confirm({ title: `Delete ${editing.display_name}?`, message: 'Guides they wrote keep their content but lose the byline. Deactivating is usually better.' }))) return;
              await run(() => api.delete(`/admin/users/${editing.id}`), 'User deleted');
              setEditing(null);
              reload();
            }}>Delete</Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
          <Button size="sm" loading={busy} onClick={save}>Save</Button>
        </>}>
        {editing && (
          <div className="grid gap-4">
            <TextInput label="Name" value={editing.display_name} onChange={set('display_name')} hint="Shown as the author byline on guides." />
            <TextInput label="Email" type="email" value={editing.email} onChange={set('email')} />
            <TextInput label={editing.id ? 'New password (leave blank to keep)' : 'Password'} type="password" autoComplete="new-password" value={editing.password} onChange={set('password')} hint="At least 10 characters." />
            <SelectInput label="Role" value={editing.role} onChange={set('role')} options={ROLES} />
            <TextArea label="Bio" value={editing.bio} onChange={set('bio')} rows={2} />
            {editing.id && editing.id !== me.id && <Toggle label="Active" hint="Inactive users can't sign in." checked={editing.active} onChange={set('active')} />}
          </div>
        )}
      </AdminModal>
    </>
  );
}
