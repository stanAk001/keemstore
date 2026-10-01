import * as Media from '../services/media.service.js';
import { one } from '../config/db.js';
import { cloudinaryConfigured } from '../config/env.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { paginate, pageMeta } from '../utils/sql.js';

export async function list(req, res) {
  const pg = paginate(req.query, { defaultLimit: 60, maxLimit: 120 });
  const { items, total } = await Media.listMedia({ q: req.query.q, limit: pg.limit, offset: pg.offset });
  res.json({ items, ...pageMeta(total, pg), cloudinary: cloudinaryConfigured });
}

export async function upload(req, res) {
  if (!req.file) throw badRequest('Choose an image or video to upload');
  const item = await Media.uploadFile(req.file, req.body || {}, req.user.id);
  res.status(201).json(item);
}

export async function addExternal(req, res) {
  res.status(201).json(await Media.addFromUrl(req.body, req.user.id));
}

export async function update(req, res) {
  const b = req.body;
  const item = await one(
    `update media set alt = $1, caption = $2, credit = $3, filename = coalesce($4, filename) where id = $5 returning *`,
    [b.alt ?? null, b.caption ?? null, b.credit ?? null, b.filename ?? null, req.params.id],
  );
  if (!item) throw notFound('Image not found');
  res.json(item);
}

export async function usage(req, res) {
  const item = await one('select url from media where id = $1', [req.params.id]);
  if (!item) throw notFound('Image not found');
  res.json(await Media.mediaUsage(item.url));
}

export async function remove(req, res) {
  const item = await one('select url from media where id = $1', [req.params.id]);
  if (!item) throw notFound('Image not found');
  const used = await Media.mediaUsage(item.url);
  if (used.length && req.query.force !== 'true') {
    return res.status(409).json({ error: 'This image is still used on the site', usage: used });
  }
  await Media.deleteMedia(Number(req.params.id));
  res.status(204).end();
}
