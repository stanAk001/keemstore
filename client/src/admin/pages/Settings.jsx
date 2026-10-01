import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../../lib/api.js';
import { clearCache } from '../../lib/useFetch.js';
import Button from '../../components/ui/Button.jsx';
import Icon from '../../components/ui/Icon.jsx';
import { PageHeader, Panel, Loading, LoadError, AdminModal, AdminTable, TextInput, TextArea, Toggle, useAdminData, useAction, useConfirm, useLookups } from '../components/ui.jsx';
import { ImageField } from '../components/MediaPicker.jsx';

const TITLES = {
  site: ['Site settings', 'Brand, announcement bar, newsletter copy and footer.'],
  seo: ['SEO settings', 'Defaults used when a page has no SEO fields of its own.'],
  affiliate: ['Affiliate settings', 'Disclosure copy, button labels and affiliate programs.'],
  social: ['Social links', 'Shown in the footer. Leave blank to hide.'],
};

function Programs() {
  const { data, reload } = useAdminData('/admin/affiliate-programs');
  const lookups = useLookups();
  const [editing, setEditing] = useState(null);
  const [run, busy] = useAction();
  const confirm = useConfirm();
  const set = (k) => (v) => setEditing((e) => ({ ...e, [k]: v }));
  const save = async () => {
    const { id, name, network, base_domain, tracking_param, tracking_id, link_template, active } = editing;
    const body = { name, network, base_domain, tracking_param, tracking_id, link_template, active };
    await run(() => (id ? api.put(`/admin/affiliate-programs/${id}`, body) : api.post('/admin/affiliate-programs', body)), 'Program saved');
    setEditing(null);
    reload();
    lookups.reload();
  };
  return (
    <Panel title="Affiliate programs" description="Amazon is built in. Add other networks here; product links can then be attached to them."
      actions={<Button size="sm" variant="subtle" icon="plus" onClick={() => setEditing({ name: '', network: '', base_domain: '', tracking_param: '', tracking_id: '', link_template: '', active: true })}>Add program</Button>}>
      <AdminTable rows={data} columns={[
        { key: 'name', label: 'Program', render: (p) => <span className="font-medium">{p.name}</span> },
        { key: 'base_domain', label: 'Domain' },
        { key: 'tracking', label: 'Tracking', render: (p) => (p.link_template ? <span className="text-[0.8rem]">Wrapped in {p.network || 'network'} link ✓</span> : p.tracking_param ?<span className="font-mono text-[0.75rem]">{p.tracking_param}={p.tracking_id || (p.env_tag_fallback ? '(from AMAZON_ASSOCIATE_TAG)' : <span className="text-accent-ink">not set</span>)}</span> : '—') },
        { key: 'link_count', label: 'Links', className: 'font-mono' },
        { key: 'x', label: '', render: (p) => (
          <span className="flex gap-2">
            <button onClick={() => setEditing({ ...p })} className="p-1 text-faint hover:text-ink" aria-label="Edit"><Icon name="edit" size={15} /></button>
            {p.slug !== 'amazon' && <button onClick={async () => {
              if (!(await confirm({ title: `Delete ${p.name}?`, message: p.link_count ? 'Programs with product links cannot be deleted — remove the links first.' : 'This cannot be undone.' }))) return;
              await run(() => api.delete(`/admin/affiliate-programs/${p.id}`), 'Deleted');
              reload();
            }} className="p-1 text-faint hover:text-accent-ink" aria-label="Delete"><Icon name="trash" size={15} /></button>}
          </span>
        ) },
      ]} />
      <AdminModal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? `Edit ${editing.name}` : 'New affiliate program'}
        footer={<><Button variant="ghost" size="sm" onClick={() => setEditing(null)}>Cancel</Button><Button size="sm" loading={busy} onClick={save}>Save</Button></>}>
        {editing && (
          <div className="grid gap-4">
            <TextInput label="Name" value={editing.name} onChange={set('name')} />
            <TextInput label="Network" value={editing.network} onChange={set('network')} placeholder="e.g. Impact, ShareASale" />
            <TextInput label="Retailer domain" value={editing.base_domain} onChange={set('base_domain')} placeholder="amazon.com" hint="The tracking parameter is only added to links on this domain." />
            <div className="grid grid-cols-2 gap-3">
              <TextInput label="Tracking parameter" value={editing.tracking_param} onChange={set('tracking_param')} placeholder="tag" />
              <TextInput label="Tracking ID" value={editing.tracking_id} onChange={set('tracking_id')} placeholder="yourtag-20" hint={editing.slug === 'amazon' ? 'Blank = use AMAZON_ASSOCIATE_TAG from the server.' : undefined} />
            </div>
            {editing.slug !== 'amazon' && (
              <TextInput
                label="Link template (networks like Rakuten, Awin)"
                value={editing.link_template}
                onChange={set('link_template')}
                placeholder="https://click.linksynergy.com/deeplink?id=YOURID&mid=12345&murl={url}"
                hint="Used instead of the tracking parameter. {url} is replaced with the product page link on every click."
              />
            )}
            <Toggle label="Active" checked={editing.active} onChange={set('active')} />
          </div>
        )}
      </AdminModal>
    </Panel>
  );
}

export default function Settings() {
  const { group } = useParams();
  const { data, error, loading, reload } = useAdminData('/admin/settings');
  const [form, setForm] = useState(null);
  const [run, busy] = useAction();
  useEffect(() => { if (data) setForm(data); }, [data]);

  if (!TITLES[group]) return <p className="text-muted">Unknown settings page.</p>;
  if (loading && !form) return <Loading />;
  if (error) return <LoadError error={error} onRetry={reload} />;
  if (!form) return null;

  const set = (g, k) => (v) => setForm((f) => ({ ...f, [g]: { ...f[g], [k]: v } }));
  const groups = { site: ['site', 'announcement', 'newsletter', 'footer'], seo: ['seo'], affiliate: ['affiliate'], social: ['social'] }[group];
  const save = async () => {
    await run(() => api.put('/admin/settings', Object.fromEntries(groups.map((g) => [g, form[g]]))), 'Settings saved');
    clearCache('/settings');
    reload();
  };
  const [title, subtitle] = TITLES[group];

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={<Button size="sm" loading={busy} onClick={save}>Save settings</Button>} />
      <div className="grid max-w-3xl gap-6">
        {group === 'site' && (
          <>
            <Panel title="Brand">
              <div className="grid gap-4">
                <TextInput label="Site name" value={form.site.name} onChange={set('site', 'name')} />
                <TextInput label="Tagline" value={form.site.tagline} onChange={set('site', 'tagline')} />
                <TextArea label="Description" value={form.site.description} onChange={set('site', 'description')} rows={2} />
                <TextInput label="Contact email" type="email" value={form.site.contact_email} onChange={set('site', 'contact_email')} hint="Shown on the Contact page." />
                <ImageField label="Logo (optional)" hint="Leave empty to use the typeset wordmark." value={form.site.logo_url} onChange={set('site', 'logo_url')} aspect="3/1" />
              </div>
            </Panel>
            <Panel title="Announcement bar" description="The thin bar at the very top of every page.">
              <div className="grid gap-4">
                <Toggle label="Show announcement bar" checked={form.announcement.enabled} onChange={set('announcement', 'enabled')} />
                <div className="grid gap-4 md:grid-cols-3">
                  <TextInput label="Label" value={form.announcement.label} onChange={set('announcement', 'label')} />
                  <TextInput label="Text" value={form.announcement.text} onChange={set('announcement', 'text')} />
                  <TextInput label="Link" value={form.announcement.url} onChange={set('announcement', 'url')} placeholder="/seasonal/halloween" />
                </div>
              </div>
            </Panel>
            <Panel title="Newsletter">
              <div className="grid gap-4">
                <Toggle label="Accept sign-ups" checked={form.newsletter.enabled} onChange={set('newsletter', 'enabled')} />
                <TextInput label="Headline" value={form.newsletter.headline} onChange={set('newsletter', 'headline')} />
                <TextArea label="Supporting text" value={form.newsletter.subtext} onChange={set('newsletter', 'subtext')} rows={2} />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput label="Button label" value={form.newsletter.button_label} onChange={set('newsletter', 'button_label')} />
                  <TextInput label="Success message" value={form.newsletter.success_message} onChange={set('newsletter', 'success_message')} />
                </div>
              </div>
            </Panel>
            <Panel title="Footer">
              <div className="grid gap-4">
                <TextArea label="Footer blurb" value={form.footer.blurb} onChange={set('footer', 'blurb')} rows={2} />
                <div className="grid gap-4 md:grid-cols-3">
                  <TextInput label="Credit label" value={form.footer.credit_label} onChange={set('footer', 'credit_label')} placeholder="Designed & built by" />
                  <TextInput label="Designer name" value={form.footer.credit_name} onChange={set('footer', 'credit_name')} hint="Leave blank to hide the credit." />
                  <TextInput label="Designer link" value={form.footer.credit_url} onChange={set('footer', 'credit_url')} placeholder="https://… or mailto:you@…" hint="Portfolio, LinkedIn or email." />
                </div>
              </div>
            </Panel>
          </>
        )}
        {group === 'seo' && (
          <Panel>
            <div className="grid gap-4">
              <TextInput label="Title suffix" value={form.seo.title_suffix} onChange={set('seo', 'title_suffix')} hint="Appended to every page title, e.g. “ — keemstore”." />
              <TextArea label="Default meta description" value={form.seo.default_description} onChange={set('seo', 'default_description')} rows={2} />
              <ImageField label="Default social image" value={form.seo.default_og_image} onChange={set('seo', 'default_og_image')} aspect="1200/630" />
              <TextInput label="X / Twitter handle" value={form.seo.twitter_handle} onChange={set('seo', 'twitter_handle')} placeholder="@keemstore" />
              <TextInput label="Pinterest domain verification" value={form.seo.pinterest_domain_verify} onChange={set('seo', 'pinterest_domain_verify')} hint="The content value of Pinterest's p:domain_verify meta tag." />
              <TextInput label="Google site verification" value={form.seo.google_site_verification} onChange={set('seo', 'google_site_verification')} />
              <p className="text-[0.8rem] text-muted">Sitemap: <a className="underline" href="/sitemap.xml" target="_blank" rel="noreferrer">/sitemap.xml</a> · Robots: <a className="underline" href="/robots.txt" target="_blank" rel="noreferrer">/robots.txt</a></p>
            </div>
          </Panel>
        )}
        {group === 'affiliate' && (
          <>
            <Panel>
              <div className="grid gap-4">
                <TextArea label="Short disclosure" hint="Shown on guides, product pages and in the footer." value={form.affiliate.disclosure_short} onChange={set('affiliate', 'disclosure_short')} rows={3} />
                <div className="grid gap-4 md:grid-cols-2">
                  <TextInput label="Primary button label" value={form.affiliate.cta_primary} onChange={set('affiliate', 'cta_primary')} />
                  <TextInput label="Secondary button label" value={form.affiliate.cta_secondary} onChange={set('affiliate', 'cta_secondary')} />
                </div>
                <div className="rounded-sm border border-line bg-paper p-4">
                  <p className="text-[0.85rem] font-semibold">Prices and star ratings</p>
                  <p className="mt-1 mb-3 text-[0.78rem] leading-relaxed text-muted">Amazon’s Associates policies only allow showing prices and ratings that come from Amazon’s Product Advertising API and are kept up to date. Prices typed in by hand go stale and can put your account at risk, so keep these off unless you connect the API. Prices you enter are still used privately for “Under 5” sections and price sorting.</p>
                  <div className="grid gap-3">
                    <Toggle label="Show prices on the site" checked={form.affiliate.show_prices} onChange={set('affiliate', 'show_prices')} />
                    <Toggle label="Show star ratings and review counts" checked={form.affiliate.show_ratings} onChange={set('affiliate', 'show_ratings')} />
                  </div>
                </div>
                <Toggle label="Add Amazon tracking tag automatically" hint="Adds your tag to Amazon URLs that don't already have one." checked={form.affiliate.append_amazon_tag} onChange={set('affiliate', 'append_amazon_tag')} />
              </div>
            </Panel>
            <Programs />
          </>
        )}
        {group === 'social' && (
          <Panel>
            <div className="grid gap-4">
              {['pinterest', 'instagram', 'tiktok', 'x', 'youtube', 'facebook'].map((k) => (
                <TextInput key={k} label={k === 'x' ? 'X' : k[0].toUpperCase() + k.slice(1)} value={form.social[k]} onChange={set('social', k)} placeholder="https://…" />
              ))}
            </div>
          </Panel>
        )}
      </div>
    </>
  );
}
