import { many, one, query, transaction } from '../config/db.js';
import { getSettings, updateSettings } from '../services/settings.service.js';
import { getPrograms, invalidatePrograms } from '../services/affiliate.service.js';
import { categoryTree } from '../models/category.model.js';
import { env } from '../config/env.js';
import { slugify } from '../utils/slug.js';
import { badRequest, notFound } from '../utils/httpError.js';

async function navigation() {
  const rows = await many('select id, location, label, url, sort_order, active from navigation_items order by location, sort_order, id');
  return rows;
}

/** Everything the public layout needs, in one cacheable request. */
export async function publicBootstrap(_req, res) {
  const [settings, nav, categories] = await Promise.all([getSettings(), navigation(), categoryTree()]);
  const byLocation = {};
  for (const item of nav.filter((n) => n.active)) (byLocation[item.location] ||= []).push({ label: item.label, url: item.url });
  res.json({
    site: { ...settings.site, url: env.clientUrl },
    announcement: settings.announcement,
    seo: settings.seo,
    affiliate: settings.affiliate,
    social: settings.social,
    newsletter: settings.newsletter,
    footer: settings.footer,
    navigation: byLocation,
    categories: categories.map((c) => ({
      id: c.id, name: c.name, slug: c.slug, path: c.path, featured: c.featured, image_url: c.image_url,
      children: c.children.map((k) => ({ id: k.id, name: k.name, slug: k.slug, path: k.path })),
    })),
    registration_open: env.allowPublicRegistration,
  });
}

export async function getAll(_req, res) {
  res.json(await getSettings({ fresh: true }));
}

export async function saveAll(req, res) {
  if (typeof req.body !== 'object' || Array.isArray(req.body)) throw badRequest('Expected an object of setting groups');
  res.json(await updateSettings(req.body));
}

// ---- navigation -------------------------------------------------------------
export async function getNavigation(_req, res) {
  res.json(await navigation());
}

/** Replace all navigation items; order within each location is list order. */
export async function saveNavigation(req, res) {
  await transaction(async (client) => {
    await client.query('delete from navigation_items');
    const pos = {};
    for (const item of req.body.items) {
      pos[item.location] = (pos[item.location] ?? -1) + 1;
      await client.query(
        'insert into navigation_items (location, label, url, sort_order, active) values ($1, $2, $3, $4, $5)',
        [item.location, item.label, item.url, pos[item.location], item.active],
      );
    }
  });
  res.json(await navigation());
}

// ---- affiliate programs -----------------------------------------------------
export async function listPrograms(_req, res) {
  const rows = await many(`select ap.*, (select count(*)::int from affiliate_links l where l.program_id = ap.id) as link_count
                             from affiliate_programs ap order by id`);
  res.json(rows.map((p) => ({ ...p, env_tag_fallback: p.slug === 'amazon' && !p.tracking_id && Boolean(env.amazonAssociateTag) })));
}

export async function createProgram(req, res) {
  const slug = req.body.slug || slugify(req.body.name);
  const row = await one(
    `insert into affiliate_programs (name, slug, network, base_domain, tracking_param, tracking_id, link_template, active)
     values ($1, $2, $3, $4, $5, $6, $7, coalesce($8, true)) returning *`,
    [req.body.name, slug, req.body.network ?? null, req.body.base_domain ?? null, req.body.tracking_param ?? null,
      req.body.tracking_id ?? null, req.body.link_template ?? null, req.body.active ?? null],
  );
  invalidatePrograms();
  res.status(201).json(row);
}

export async function updateProgram(req, res) {
  const b = req.body;
  const row = await one(
    `update affiliate_programs set name = $1, network = $2, base_domain = $3, tracking_param = $4,
            tracking_id = $5, link_template = $6, active = coalesce($7, active) where id = $8 returning *`,
    [b.name, b.network ?? null, b.base_domain ?? null, b.tracking_param ?? null, b.tracking_id ?? null, b.link_template ?? null,
      b.active ?? null, req.params.id],
  );
  if (!row) throw notFound('Program not found');
  invalidatePrograms();
  res.json(row);
}

export async function deleteProgram(req, res) {
  const program = (await getPrograms()).get(Number(req.params.id));
  if (program?.slug === 'amazon') throw badRequest('The Amazon program is built in. Deactivate it instead.');
  const { rowCount } = await query('delete from affiliate_programs where id = $1', [req.params.id]);
  if (!rowCount) throw notFound('Program not found');
  invalidatePrograms();
  res.status(204).end();
}
