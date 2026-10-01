// Newsletter, Pinterest content manager, tracking, analytics, search, lookups.
import { many, one, query } from '../config/db.js';
import { listPinnableContent, savePinterest } from '../services/pinterest.service.js';
import * as Analytics from '../services/analytics.service.js';
import * as Search from '../services/search.service.js';
import { getSettings } from '../services/settings.service.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { cloudinaryConfigured } from '../config/env.js';
import { paginate, pageMeta } from '../utils/sql.js';

// ---- newsletter -------------------------------------------------------------
export async function subscribe(req, res) {
  const settings = await getSettings();
  if (!settings.newsletter.enabled) throw badRequest('Newsletter sign-ups are paused');
  // Honeypot filled in → pretend success, store nothing.
  if (req.body.website) return res.status(201).json({ message: settings.newsletter.success_message });
  await query(
    `insert into newsletter_subscribers (email, source) values ($1, $2)
     on conflict (lower(email)) do update set status = 'subscribed', unsubscribed_at = null`,
    [req.body.email, req.body.source ?? null],
  );
  res.status(201).json({ message: settings.newsletter.success_message });
}

export async function listSubscribers(req, res) {
  const pg = paginate(req.query, { defaultLimit: 100, maxLimit: 500 });
  const where = req.query.status ? 'where status = $1' : '';
  const params = req.query.status ? [req.query.status] : [];
  const [items, total] = await Promise.all([
    many(`select * from newsletter_subscribers ${where} order by created_at desc limit ${pg.limit} offset ${pg.offset}`, params),
    one(`select count(*)::int as total from newsletter_subscribers ${where}`, params),
  ]);
  res.json({ items, ...pageMeta(total.total, pg) });
}

export async function exportSubscribers(_req, res) {
  const rows = await many(`select email, source, status, created_at from newsletter_subscribers where status = 'subscribed' order by created_at`);
  const csvCell = (v) => {
    const s = v instanceof Date ? v.toISOString() : String(v ?? '');
    // Neutralise spreadsheet formula injection and quote everything.
    return `"${(/^[=+\-@]/.test(s) ? `'${s}` : s).replace(/"/g, '""')}"`;
  };
  const csv = ['email,source,status,subscribed_at', ...rows.map((r) => [r.email, r.source, r.status, r.created_at].map(csvCell).join(','))].join('\n');
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="subscribers-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.send(csv);
}

export async function updateSubscriber(req, res) {
  const status = req.body?.status;
  if (!['subscribed', 'unsubscribed'].includes(status)) throw badRequest('Invalid status');
  const row = await one(
    `update newsletter_subscribers set status = $1, unsubscribed_at = case when $1 = 'unsubscribed' then now() end
      where id = $2 returning *`,
    [status, req.params.id],
  );
  if (!row) throw notFound('Subscriber not found');
  res.json(row);
}

export async function deleteSubscriber(req, res) {
  const { rowCount } = await query('delete from newsletter_subscribers where id = $1', [req.params.id]);
  if (!rowCount) throw notFound('Subscriber not found');
  res.status(204).end();
}

// ---- Pinterest --------------------------------------------------------------
export async function pinterestList(_req, res) {
  res.json(await listPinnableContent());
}

export async function pinterestSave(req, res) {
  const { entity_type, entity_id, ...fields } = req.body;
  res.json(await savePinterest({ query: (t, p) => query(t, p) }, entity_type, entity_id, fields));
}

// ---- tracking (public beacons) ---------------------------------------------
export async function trackClick(req, res) {
  await Analytics.recordClick(req.body, req);
  res.status(204).end();
}

export async function trackEvent(req, res) {
  await Analytics.recordEvent(req.body, req);
  res.status(204).end();
}

// ---- analytics (admin) ------------------------------------------------------
const range = (r) => (Object.hasOwn(Analytics.RANGES, r) ? r : '30d');

export async function dashboard(_req, res) {
  res.json(await Analytics.dashboardOverview());
}

export async function clicks(req, res) {
  res.json(await Analytics.clickSummary(range(req.query.range)));
}

export async function contentPerformance(req, res) {
  res.json(await Analytics.contentPerformance(range(req.query.range)));
}

export async function recentClicks(_req, res) {
  res.json(await many(`select a.id, a.created_at, a.cta_location, a.page_path, a.device, a.source,
                              p.name as product_name, g.title as guide_title
                         from affiliate_clicks a
                         left join products p on p.id = a.product_id
                         left join guides g on g.id = a.guide_id
                        order by a.created_at desc limit 50`));
}

// ---- search -----------------------------------------------------------------
export async function suggest(req, res) {
  res.json(await Search.suggest(req.query.q));
}

export async function search(req, res) {
  const result = await Search.search(req.query.q, { type: req.query.type, category: req.query.category });
  if (result.q) {
    // Log the query server-side so every search is counted once.
    Analytics.recordEvent({ event_type: 'search', query: result.q, path: '/search', referrer: req.get('referer') }, req).catch(() => {});
  }
  res.json(result);
}

// ---- lookups for admin pickers ---------------------------------------------
export async function lookups(_req, res) {
  const [products, guides, categories, trends, collections, seasonal, programs, authors] = await Promise.all([
    many(`select p.id, p.name, p.slug, p.brand, p.price_display, p.active,
                 (select url from product_images i where i.product_id = p.id order by sort_order limit 1) as image
            from products p order by p.name`),
    many('select id, title, slug, status from guides order by title'),
    many(`select c.id, c.name, c.parent_id, p.name as parent_name,
                 case when p.slug is null then '/' || c.slug else '/' || p.slug || '/' || c.slug end as path
            from categories c left join categories p on p.id = c.parent_id
           order by coalesce(p.sort_order, c.sort_order), coalesce(p.id, c.id), c.parent_id nulls first, c.sort_order`),
    many('select id, title, slug, active from trends order by sort_order, title'),
    many('select id, title, slug from collections order by title'),
    many('select id, title, slug from seasonal_pages order by sort_order'),
    many('select id, name, slug, active, base_domain, tracking_param, tracking_id, link_template from affiliate_programs order by id'),
    many(`select u.id, u.display_name from users u join roles r on r.id = u.role_id
           where r.name in ('admin','editor') and u.active order by u.display_name`),
  ]);
  res.json({ products, guides, categories, trends, collections, seasonal, programs, authors, cloudinary: cloudinaryConfigured });
}
