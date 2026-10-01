// Trends, collections, seasonal pages, static pages and the homepage builder.
import * as Trends from '../models/trend.model.js';
import * as Collections from '../models/collection.model.js';
import * as Seasonal from '../models/seasonal.model.js';
import * as Pages from '../models/page.model.js';
import { findProducts } from '../models/product.model.js';
import { listGuides, getGuidesByIds } from '../models/guide.model.js';
import { pinterestFor } from '../services/pinterest.service.js';
import { resolveSections } from '../services/sections.service.js';
import { many, transaction } from '../config/db.js';
import { resolveSlug } from '../utils/uniqueSlug.js';
import { notFound } from '../utils/httpError.js';

// ===========================================================================
// Trends
// ===========================================================================
export async function listTrendsPublic(req, res) {
  res.json(await Trends.listTrends({ limit: req.query.limit || 30, status: req.query.status }));
}

export async function getTrendPublic(req, res) {
  const trend = await Trends.getTrend('slug', req.params.slug);
  if (!trend) throw notFound('Trend not found');
  const catIds = [trend.linked_category_id, trend.category_id].filter(Boolean);
  const [guide, products, guides] = await Promise.all([
    trend.linked_guide_id ? getGuidesByIds([trend.linked_guide_id]) : [],
    findProducts({ categoryIds: catIds.length ? catIds : undefined, q: catIds.length ? undefined : trend.keyword || trend.title, limit: 8 }),
    catIds.length ? listGuides({ categoryIds: catIds, limit: 4, excludeIds: [trend.linked_guide_id].filter(Boolean) }) : { items: [] },
  ]);
  res.json({ ...trend, guide: guide[0] || null, products: products.items, guides: guides.items });
}

export async function listTrendsAdmin(_req, res) {
  res.json(await Trends.listTrends({ admin: true, limit: 200 }));
}

export async function getTrendAdmin(req, res) {
  const trend = await Trends.getTrend('id', Number(req.params.id), { admin: true });
  if (!trend) throw notFound('Trend not found');
  res.json({ ...trend, pinterest: await pinterestFor('trend', trend.id) });
}

export async function createTrend(req, res) {
  const slug = await resolveSlug('trends', { slug: req.body.slug, source: req.body.title });
  const id = await Trends.createTrend({ ...req.body, slug });
  res.status(201).json(await Trends.getTrend('id', id, { admin: true }));
}

export async function updateTrend(req, res) {
  const id = Number(req.params.id);
  const data = { ...req.body };
  if (data.slug) data.slug = await resolveSlug('trends', { slug: data.slug, excludeId: id });
  if (!(await Trends.updateTrend(id, data))) throw notFound('Trend not found');
  res.json(await Trends.getTrend('id', id, { admin: true }));
}

export async function deleteTrend(req, res) {
  if (!(await Trends.deleteTrend(Number(req.params.id)))) throw notFound('Trend not found');
  res.status(204).end();
}

export async function reorderTrends(req, res) {
  await Trends.reorderTrends(req.body.ids);
  res.json({ ok: true });
}

// ===========================================================================
// Collections
// ===========================================================================
export async function getCollectionPublic(req, res) {
  const c = await Collections.getCollection('slug', req.params.slug);
  if (!c) throw notFound('Collection not found');
  res.json(c);
}

export async function listCollectionsPublic(_req, res) {
  res.json(await Collections.listCollections());
}

export async function listCollectionsAdmin(_req, res) {
  res.json(await Collections.listCollections({ admin: true }));
}

export async function getCollectionAdmin(req, res) {
  const c = await Collections.getCollection('id', Number(req.params.id), { admin: true });
  if (!c) throw notFound('Collection not found');
  res.json(c);
}

export async function createCollection(req, res) {
  const slug = await resolveSlug('collections', { slug: req.body.slug, source: req.body.title });
  const id = await Collections.createCollection({ ...req.body, slug });
  res.status(201).json(await Collections.getCollection('id', id, { admin: true }));
}

export async function updateCollection(req, res) {
  const id = Number(req.params.id);
  const data = { ...req.body };
  if (data.slug) data.slug = await resolveSlug('collections', { slug: data.slug, excludeId: id });
  if (!(await Collections.updateCollection(id, data))) throw notFound('Collection not found');
  res.json(await Collections.getCollection('id', id, { admin: true }));
}

export async function deleteCollection(req, res) {
  if (!(await Collections.deleteCollection(Number(req.params.id)))) throw notFound('Collection not found');
  res.status(204).end();
}

// ===========================================================================
// Seasonal pages
// ===========================================================================
export async function listSeasonalPublic(_req, res) {
  res.json(await Seasonal.listSeasonalPages());
}

export async function getSeasonalPublic(req, res) {
  const page = await Seasonal.getSeasonalPage('slug', req.params.slug);
  if (!page) throw notFound('Seasonal page not found');
  res.json({ ...page, sections: await resolveSections(page.sections) });
}

export async function listSeasonalAdmin(_req, res) {
  res.json(await Seasonal.listSeasonalPages({ admin: true }));
}

export async function getSeasonalAdmin(req, res) {
  const page = await Seasonal.getSeasonalPage('id', Number(req.params.id), { admin: true });
  if (!page) throw notFound('Seasonal page not found');
  res.json(page);
}

export async function createSeasonal(req, res) {
  const slug = await resolveSlug('seasonal_pages', { slug: req.body.slug, source: req.body.title });
  const id = await Seasonal.createSeasonalPage({ ...req.body, slug });
  res.status(201).json(await Seasonal.getSeasonalPage('id', id, { admin: true }));
}

export async function updateSeasonal(req, res) {
  const id = Number(req.params.id);
  const data = { ...req.body };
  if (data.slug) data.slug = await resolveSlug('seasonal_pages', { slug: data.slug, excludeId: id });
  if (!(await Seasonal.updateSeasonalPage(id, data))) throw notFound('Seasonal page not found');
  res.json(await Seasonal.getSeasonalPage('id', id, { admin: true }));
}

export async function deleteSeasonal(req, res) {
  if (!(await Seasonal.deleteSeasonalPage(Number(req.params.id)))) throw notFound('Seasonal page not found');
  res.status(204).end();
}

// ===========================================================================
// Static pages
// ===========================================================================
export async function getPagePublic(req, res) {
  const page = await Pages.getPage('slug', req.params.slug);
  if (!page) throw notFound('Page not found');
  res.json(page);
}

export async function listPagesAdmin(_req, res) {
  res.json(await Pages.listPages({ admin: true }));
}

export async function getPageAdmin(req, res) {
  const page = await Pages.getPage('id', Number(req.params.id), { admin: true });
  if (!page) throw notFound('Page not found');
  res.json(page);
}

export async function createPage(req, res) {
  const slug = await resolveSlug('pages', { slug: req.body.slug, source: req.body.title });
  res.status(201).json(await Pages.createPage({ ...req.body, slug }));
}

export async function updatePage(req, res) {
  const id = Number(req.params.id);
  const data = { ...req.body };
  if (data.slug) data.slug = await resolveSlug('pages', { slug: data.slug, excludeId: id });
  const page = await Pages.updatePage(id, data);
  if (!page) throw notFound('Page not found');
  res.json(page);
}

export async function deletePage(req, res) {
  if (!(await Pages.deletePage(Number(req.params.id)))) throw notFound('Page not found');
  res.status(204).end();
}

// ===========================================================================
// Homepage builder
// ===========================================================================
export async function homepagePublic(_req, res) {
  const sections = await many('select * from homepage_sections where enabled order by sort_order, id');
  res.json({ sections: await resolveSections(sections) });
}

export async function homepageAdmin(_req, res) {
  res.json({ sections: await many('select * from homepage_sections order by sort_order, id') });
}

/** Replace the section list. Sections keep their `key` so ids stay stable. */
export async function saveHomepage(req, res) {
  await transaction(async (client) => {
    const keys = [];
    for (const [i, s] of req.body.sections.entries()) {
      const key = s.key || `${s.type}-${Date.now().toString(36)}-${i}`;
      keys.push(key);
      await client.query(
        `insert into homepage_sections (key, type, title, subtitle, config, sort_order, enabled)
         values ($1, $2, $3, $4, $5, $6, $7)
         on conflict (key) do update set type = excluded.type, title = excluded.title, subtitle = excluded.subtitle,
           config = excluded.config, sort_order = excluded.sort_order, enabled = excluded.enabled`,
        [key, s.type, s.title ?? null, s.subtitle ?? null, JSON.stringify(s.config || {}), i, s.enabled],
      );
    }
    await client.query('delete from homepage_sections where not (key = any($1))', [keys]);
  });
  return homepageAdmin(req, res);
}
