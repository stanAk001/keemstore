import * as Guides from '../models/guide.model.js';
import { resolveSlug } from '../utils/uniqueSlug.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { paginate, pageMeta } from '../utils/sql.js';

// ---- public ---------------------------------------------------------------
export async function listPublic(req, res) {
  const pg = paginate(req.query, { defaultLimit: 12, maxLimit: 48 });
  const categoryIds = req.query.category ? String(req.query.category).split(',').map(Number).filter(Boolean) : undefined;
  const { items, total } = await Guides.listGuides({
    categoryIds,
    featured: req.query.featured === 'true',
    q: req.query.q,
    sort: req.query.sort,
    limit: pg.limit,
    offset: pg.offset,
  });
  res.json({ items, ...pageMeta(total, pg) });
}

/** Staff can preview drafts by passing ?preview=1 with their token. */
export async function getPublic(req, res) {
  const preview = req.query.preview === '1' && ['admin', 'editor'].includes(req.user?.role);
  const guide = await Guides.getGuideFull('slug', req.params.slug, { includeDrafts: preview });
  if (!guide) throw notFound('Guide not found');
  if (preview) res.set('Cache-Control', 'no-store');
  res.json(guide);
}

// ---- admin ----------------------------------------------------------------
export async function listAdmin(req, res) {
  const pg = paginate(req.query, { defaultLimit: 50, maxLimit: 200 });
  const { items, total } = await Guides.listGuides(
    { status: req.query.status, q: req.query.q, limit: pg.limit, offset: pg.offset },
    { admin: true },
  );
  res.json({ items, ...pageMeta(total, pg), counts: await Guides.guideStatusCounts() });
}

export async function getAdmin(req, res) {
  const guide = await Guides.getGuideFull('id', Number(req.params.id), { admin: true, includeDrafts: true });
  if (!guide) throw notFound('Guide not found');
  res.json(guide);
}

function checkSchedule(data) {
  if (data.status === 'scheduled') {
    if (!data.published_at) throw badRequest('Choose a publish date to schedule this guide');
    // A schedule date in the past means it should simply be live.
    if (new Date(data.published_at) <= new Date()) data.status = 'published';
  }
}

export async function create(req, res) {
  checkSchedule(req.body);
  const data = {
    ...req.body,
    slug: await resolveSlug('guides', { slug: req.body.slug, source: req.body.title }),
    author_id: req.body.author_id ?? req.user.id,
  };
  const id = await Guides.createGuide(data);
  res.status(201).json(await Guides.getGuideFull('id', id, { admin: true, includeDrafts: true }));
}

export async function update(req, res) {
  const id = Number(req.params.id);
  checkSchedule(req.body);
  const data = { ...req.body };
  if (data.slug) data.slug = await resolveSlug('guides', { slug: data.slug, excludeId: id });
  if (!(await Guides.updateGuide(id, data))) throw notFound('Guide not found');
  res.json(await Guides.getGuideFull('id', id, { admin: true, includeDrafts: true }));
}

export async function setStatus(req, res) {
  const status = req.body?.status;
  if (!['draft', 'published', 'archived'].includes(status)) throw badRequest('status must be draft, published or archived');
  if (!(await Guides.setGuideStatus(Number(req.params.id), status))) throw notFound('Guide not found');
  res.json(await Guides.getGuideFull('id', Number(req.params.id), { admin: true, includeDrafts: true }));
}

export async function duplicate(req, res) {
  const id = await Guides.duplicateGuide(Number(req.params.id), req.user.id);
  if (!id) throw notFound('Guide not found');
  res.status(201).json({ id });
}

export async function remove(req, res) {
  if (!(await Guides.deleteGuide(Number(req.params.id)))) throw notFound('Guide not found');
  res.status(204).end();
}
