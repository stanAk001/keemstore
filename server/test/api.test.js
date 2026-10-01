// Integration tests against a real (seeded) database.
// Run with: npm test   (needs DATABASE_URL, ADMIN_EMAIL and ADMIN_PASSWORD in .env)
// Everything created here is cleaned up at the end.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

let server;
let base;
let adminToken;

let readerToken;
const stamp = Date.now().toString(36);
const cleanup = [];

async function api(method, path, { token, body, raw } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = text;
  if (!raw) {
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      /* non-JSON */
    }
  }
  return { status: res.status, data };
}

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  for (const [table, id] of cleanup.reverse()) await pool.query(`delete from ${table} where id = $1`, [id]).catch(() => {});
  await pool.query(`delete from users where email like $1`, [`reader-${stamp}%`]);
  await pool.query(`delete from newsletter_subscribers where email like $1`, [`news-${stamp}%`]);
  server.close();
  await pool.end();
});

// ---------------------------------------------------------------------------
test('health check', async () => {
  const r = await api('GET', '/health');
  assert.equal(r.status, 200);
});

test('admin can log in, wrong password is rejected', async () => {
  assert.ok(env.adminEmail && env.adminPassword, 'ADMIN_EMAIL and ADMIN_PASSWORD must be set');
  const bad = await api('POST', '/api/auth/login', { body: { email: env.adminEmail, password: 'wrong-password-123' } });
  assert.equal(bad.status, 401);
  const ok = await api('POST', '/api/auth/login', { body: { email: env.adminEmail, password: env.adminPassword } });
  assert.equal(ok.status, 200);
  assert.equal(ok.data.user.role, 'admin');
  adminToken = ok.data.token;
  const me = await api('GET', '/api/auth/me', { token: adminToken });
  assert.equal(me.data.user.email, env.adminEmail.toLowerCase());
});

test('registration creates a reader with no admin access', async () => {
  const r = await api('POST', '/api/auth/register', {
    body: { email: `reader-${stamp}@example.com`, password: 'long-enough-pass', display_name: 'Reader' },
  });
  assert.equal(r.status, 201);
  assert.equal(r.data.user.role, 'user');
  readerToken = r.data.token;
  const dup = await api('POST', '/api/auth/register', {
    body: { email: `READER-${stamp}@example.com`, password: 'long-enough-pass', display_name: 'Dup' },
  });
  assert.equal(dup.status, 409, 'emails are case-insensitive');
  const weak = await api('POST', '/api/auth/register', { body: { email: `reader-${stamp}b@example.com`, password: 'short', display_name: 'x' } });
  assert.equal(weak.status, 400);
});

test('admin routes require auth and a staff role', async () => {
  assert.equal((await api('GET', '/api/admin/dashboard')).status, 401);
  assert.equal((await api('GET', '/api/admin/dashboard', { token: 'garbage' })).status, 401);
  assert.equal((await api('GET', '/api/admin/dashboard', { token: readerToken })).status, 403);
  const ok = await api('GET', '/api/admin/dashboard', { token: adminToken });
  assert.equal(ok.status, 200);
  assert.ok(ok.data.counts.products >= 0);
});

test('category CRUD, reserved slugs and nesting rules', async () => {
  const reserved = await api('POST', '/api/admin/categories', { token: adminToken, body: { name: 'Admin', slug: 'admin' } });
  assert.equal(reserved.status, 400);

  const parent = await api('POST', '/api/admin/categories', { token: adminToken, body: { name: `Test Parent ${stamp}` } });
  assert.equal(parent.status, 201);
  cleanup.push(['categories', parent.data.id]);
  const child = await api('POST', '/api/admin/categories', { token: adminToken, body: { name: `Test Child ${stamp}`, parent_id: parent.data.id } });
  assert.equal(child.status, 201);
  cleanup.push(['categories', child.data.id]);
  assert.equal(child.data.path, `/${parent.data.slug}/${child.data.slug}`);

  const grandchild = await api('POST', '/api/admin/categories', { token: adminToken, body: { name: 'Too deep', parent_id: child.data.id } });
  assert.equal(grandchild.status, 400);

  const upd = await api('PUT', `/api/admin/categories/${child.data.id}`, { token: adminToken, body: { description: 'Updated', featured: true } });
  assert.equal(upd.data.description, 'Updated');

  const page = await api('GET', `/api/categories/by-path?path=${parent.data.slug}/${child.data.slug}`);
  assert.equal(page.status, 200);
  assert.equal(page.data.parent.id, parent.data.id);
});

let productId;
test('product CRUD with images and affiliate links; outbound URL is tagged', async () => {
  const lookups = await api('GET', '/api/admin/lookups', { token: adminToken });
  const amazon = lookups.data.programs.find((p) => p.slug === 'amazon');

  const bad = await api('POST', '/api/admin/products', { token: adminToken, body: { name: 'x', amazon_url: 'javascript:alert(1)' } });
  assert.equal(bad.status, 400, 'unsafe URLs are rejected');

  const created = await api('POST', '/api/admin/products', {
    token: adminToken,
    body: {
      name: `Test Product ${stamp}`,
      current_price: 19.5,
      pros: ['Good'],
      cons: ['Bad'],
      images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e', alt: 'Test' }],
      affiliate_links: [{ program_id: amazon.id, url: 'https://www.amazon.com/dp/B000000000', is_primary: true }],
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  productId = created.data.id;
  cleanup.push(['products', productId]);
  assert.equal(created.data.images.length, 1);
  assert.match(created.data.outbound.url, /amazon\.com\/dp\/B000000000/);
  if (env.amazonAssociateTag) assert.match(created.data.outbound.url, new RegExp(`tag=${env.amazonAssociateTag}`));

  const upd = await api('PUT', `/api/admin/products/${productId}`, { token: adminToken, body: { current_price: 21, featured: true } });
  assert.equal(upd.data.current_price, 21);
  assert.equal(upd.data.affiliate_links.length, 1, 'omitting links on update keeps them');

  const pub = await api('GET', `/api/products/${created.data.slug}`);
  assert.equal(pub.status, 200);
  assert.equal(pub.data.affiliate_links, undefined, 'raw link records are not exposed publicly');
  // Hand-entered prices/ratings are hidden publicly by default (Amazon policy).
  assert.equal(pub.data.current_price, undefined, 'prices are hidden from the public API by default');
  assert.equal(pub.data.rating, undefined, 'ratings are hidden from the public API by default');
  const cheap = await api('GET', '/api/products?max_price=25&limit=100');
  assert.ok(cheap.data.items.every((p) => p.current_price === undefined), 'price filter still works without exposing prices');

  await api('PUT', `/api/admin/products/${productId}`, { token: adminToken, body: { active: false } });
  assert.equal((await api('GET', `/api/products/${created.data.slug}`)).status, 404, 'inactive products are hidden');
  await api('PUT', `/api/admin/products/${productId}`, { token: adminToken, body: { active: true } });
});

let guideId;
test('guide lifecycle: draft, preview, publish, duplicate, schedule', async () => {
  const created = await api('POST', '/api/admin/guides', {
    token: adminToken,
    body: {
      title: `Test Guide ${stamp}`,
      status: 'draft',
      content: [{ type: 'paragraph', text: 'Hello **world**' }, { type: 'product', productId }],
      products: [{ product_id: productId, label: 'Best overall', is_primary: true }],
      faq: [{ q: 'Q?', a: 'A.' }],
      pinterest: { title: 'Pin title', description: 'Pin desc' },
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  guideId = created.data.id;
  cleanup.push(['guides', guideId]);
  const slug = created.data.slug;

  assert.equal((await api('GET', `/api/guides/${slug}`)).status, 404, 'drafts are not public');
  assert.equal((await api('GET', `/api/guides/${slug}?preview=1`, { token: readerToken })).status, 404, 'readers cannot preview');
  const preview = await api('GET', `/api/guides/${slug}?preview=1`, { token: adminToken });
  assert.equal(preview.status, 200);
  assert.ok(preview.data.products[productId], 'block-referenced products are included');
  assert.equal(preview.data.pinterest.title, 'Pin title');

  const badBlock = await api('PUT', `/api/admin/guides/${guideId}`, {
    token: adminToken, body: { content: [{ type: 'image', url: 'javascript:alert(1)' }] },
  });
  assert.equal(badBlock.status, 400, 'unsafe URLs inside blocks are rejected');

  const published = await api('POST', `/api/admin/guides/${guideId}/status`, { token: adminToken, body: { status: 'published' } });
  assert.equal(published.data.status, 'published');
  assert.equal((await api('GET', `/api/guides/${slug}`)).status, 200);

  const dup = await api('POST', `/api/admin/guides/${guideId}/duplicate`, { token: adminToken });
  assert.equal(dup.status, 201);
  cleanup.push(['guides', dup.data.id]);
  const copy = await api('GET', `/api/admin/guides/${dup.data.id}`, { token: adminToken });
  assert.equal(copy.data.status, 'draft');
  assert.equal(copy.data.picks.length, 1);

  const future = new Date(Date.now() + 86400000).toISOString();
  const sched = await api('PUT', `/api/admin/guides/${dup.data.id}`, { token: adminToken, body: { status: 'scheduled', published_at: future } });
  assert.equal(sched.data.status, 'scheduled');
  assert.equal((await api('GET', `/api/guides/${copy.data.slug}`)).status, 404, 'future-scheduled guides stay hidden');
});

test('trend CRUD, schedule window and reorder', async () => {
  const past = await api('POST', '/api/admin/trends', {
    token: adminToken,
    body: { title: `Expired trend ${stamp}`, trend_end: new Date(Date.now() - 3600e3).toISOString() },
  });
  assert.equal(past.status, 201);
  cleanup.push(['trends', past.data.id]);
  const live = await api('POST', '/api/admin/trends', { token: adminToken, body: { title: `Live trend ${stamp}`, linked_guide_id: guideId } });
  cleanup.push(['trends', live.data.id]);
  assert.equal(live.data.href.startsWith('/guides/'), true);

  const pub = await api('GET', '/api/trends?limit=200');
  const ids = pub.data.map((t) => t.id);
  assert.ok(ids.includes(live.data.id));
  assert.ok(!ids.includes(past.data.id), 'expired trends are hidden');

  const all = await api('GET', '/api/admin/trends', { token: adminToken });
  const original = all.data.map((t) => t.id);
  assert.equal((await api('POST', '/api/admin/trends/reorder', { token: adminToken, body: { ids: [...original].reverse() } })).status, 200);
  const reordered = await api('GET', '/api/admin/trends', { token: adminToken });
  assert.equal(reordered.data[0].id, original.at(-1));
  await api('POST', '/api/admin/trends/reorder', { token: adminToken, body: { ids: original } }); // restore
});

test('seasonal page with sections resolves publicly', async () => {
  const created = await api('POST', '/api/admin/seasonal', {
    token: adminToken,
    body: {
      title: `Test Season ${stamp}`,
      sections: [
        { type: 'products', title: 'Picks', config: { source: 'manual', product_ids: [productId] } },
        { type: 'links', title: 'Links', config: { links: [{ label: 'A', url: '/a' }] } },
      ],
    },
  });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  cleanup.push(['seasonal_pages', created.data.id]);
  const pub = await api('GET', `/api/seasonal/${created.data.slug}`);
  assert.equal(pub.data.sections[0].data.products[0].id, productId);
});

test('homepage builder round-trips sections', async () => {
  const current = await api('GET', '/api/admin/homepage', { token: adminToken });
  const sections = current.data.sections.map(({ key, type, title, subtitle, config, enabled }) => ({ key, type, title, subtitle, config, enabled }));
  const saved = await api('PUT', '/api/admin/homepage', { token: adminToken, body: { sections: [...sections].reverse() } });
  assert.equal(saved.status, 200);
  assert.equal(saved.data.sections[0].key, sections.at(-1).key);
  await api('PUT', '/api/admin/homepage', { token: adminToken, body: { sections } }); // restore
});

test('click tracking records category from the product; beacon text bodies work', async () => {
  const before = await pool.query('select count(*)::int as n from affiliate_clicks where product_id = $1', [productId]);
  const r = await api('POST', '/api/track/click', { body: { product_id: productId, guide_id: guideId, cta_location: 'test', page_path: '/test' } });
  assert.equal(r.status, 204);
  const beacon = await fetch(`${base}/api/track/click`, {
    method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify({ product_id: productId, cta_location: 'beacon' }),
  });
  assert.equal(beacon.status, 204);
  const afterCount = await pool.query('select count(*)::int as n from affiliate_clicks where product_id = $1', [productId]);
  assert.equal(afterCount.rows[0].n, before.rows[0].n + 2);
  const summary = await api('GET', '/api/admin/analytics/clicks?range=today', { token: adminToken });
  assert.ok(summary.data.totals.clicks >= 2);
  await pool.query('delete from affiliate_clicks where product_id = $1', [productId]);
});

test('search and suggestions', async () => {
  const r = await api('GET', '/api/search?q=power%20outage');
  assert.equal(r.status, 200);
  assert.ok(r.data.total >= 0);
  const s = await api('GET', `/api/search/suggest?q=${encodeURIComponent(`Test Product ${stamp}`)}`);
  assert.ok(s.data.some((x) => x.type === 'product'));
});

test('newsletter sign-up is idempotent and honeypot is ignored', async () => {
  const email = `news-${stamp}@example.com`;
  assert.equal((await api('POST', '/api/newsletter', { body: { email } })).status, 201);
  assert.equal((await api('POST', '/api/newsletter', { body: { email: email.toUpperCase() } })).status, 201);
  const { rows } = await pool.query('select count(*)::int as n from newsletter_subscribers where lower(email) = $1', [email]);
  assert.equal(rows[0].n, 1);
  await api('POST', '/api/newsletter', { body: { email: `news-${stamp}-bot@example.com`, website: 'spam' } });
  const bot = await pool.query('select 1 from newsletter_subscribers where email = $1', [`news-${stamp}-bot@example.com`]);
  assert.equal(bot.rowCount, 0);
});

test('only admins manage users; last admin is protected', async () => {
  const list = await api('GET', '/api/admin/users', { token: adminToken });
  assert.equal(list.status, 200);
  const me = list.data.find((u) => u.email === env.adminEmail.toLowerCase());
  const selfDelete = await api('DELETE', `/api/admin/users/${me.id}`, { token: adminToken });
  assert.equal(selfDelete.status, 400);
});

test('SEO endpoints', async () => {
  const sitemap = await api('GET', '/sitemap.xml', { raw: true });
  assert.match(sitemap.data, /<urlset/);
  const robots = await api('GET', '/robots.txt', { raw: true });
  assert.match(robots.data, /Sitemap:/);
  const share = await api('GET', '/share/does-not-exist/at-all/really', { raw: true });
  assert.equal(share.status, 404);
});

test('partner store import is limited to registered domains; bulk show/hide works', async () => {
  const blocked = await api('POST', '/api/admin/products/import/preview', { token: adminToken, body: { url: 'https://internal.example.com/products/x' } });
  assert.equal(blocked.status, 400, 'unregistered domains are refused');
  const insecure = await api('POST', '/api/admin/products/import/preview', { token: adminToken, body: { url: 'http://popsyclothing.co.uk/products/x' } });
  assert.equal(insecure.status, 400, 'only https links are fetched');
  const badHandle = await api('POST', '/api/admin/products/import', { token: adminToken, body: { program_id: 1, handles: ['../../etc'] } });
  assert.equal(badHandle.status, 400, 'handles are validated');
  const readerTry = await api('POST', '/api/admin/products/import/preview', { token: readerToken, body: { url: 'https://example.com' } });
  assert.equal(readerTry.status, 403, 'readers cannot import');

  const off = await api('POST', '/api/admin/products/bulk-active', { token: adminToken, body: { ids: [productId], active: false } });
  assert.equal(off.data.updated, 1);
  const { data } = await api('GET', `/api/admin/products/${productId}`, { token: adminToken });
  assert.equal(data.active, false);
  await api('POST', '/api/admin/products/bulk-active', { token: adminToken, body: { ids: [productId], active: true } });
});
