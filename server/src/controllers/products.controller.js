import * as Products from '../models/product.model.js';
import * as StoreImport from '../services/storeImport.service.js';
import { query } from '../config/db.js';
import { resolveSlug } from '../utils/uniqueSlug.js';
import { notFound } from '../utils/httpError.js';
import { paginate, pageMeta } from '../utils/sql.js';

const list = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : undefined);

function filtersFrom(q) {
  return {
    q: q.q,
    categoryIds: list(q.category)?.map(Number).filter(Boolean),
    brands: list(q.brand),
    tags: list(q.tag),
    minPrice: q.min_price,
    maxPrice: q.max_price,
    featured: q.featured === 'true',
    sort: q.sort,
  };
}

// ---- public ---------------------------------------------------------------
export async function listPublic(req, res) {
  const pg = paginate(req.query);
  const { items, total } = await Products.findProducts({ ...filtersFrom(req.query), limit: pg.limit, offset: pg.offset });
  res.json({ items, ...pageMeta(total, pg) });
}

export async function getPublic(req, res) {
  const product = await Products.getProduct('slug', req.params.slug);
  if (!product) throw notFound('Product not found');
  const catIds = [product.subcategory_id, product.category_id].filter(Boolean);
  const [guides, related] = await Promise.all([
    Products.guidesForProduct(product.id),
    catIds.length ? Products.findProducts({ categoryIds: catIds, excludeIds: [product.id], limit: 4 }) : { items: [] },
  ]);
  res.json({ ...product, guides, related: related.items });
}

// ---- admin ----------------------------------------------------------------
export async function listAdmin(req, res) {
  const pg = paginate(req.query, { defaultLimit: 50, maxLimit: 200 });
  const { items, total } = await Products.findProducts(
    { ...filtersFrom(req.query), active: req.query.active, demo: req.query.demo, missingLinks: req.query.missing === '1', sort: req.query.sort || 'newest', limit: pg.limit, offset: pg.offset },
    { admin: true },
  );
  res.json({ items, ...pageMeta(total, pg) });
}

export async function getAdmin(req, res) {
  const product = await Products.getProduct('id', req.params.id, { admin: true });
  if (!product) throw notFound('Product not found');
  res.json({ ...product, guides: await Products.guidesForProduct(product.id, { admin: true }) });
}

export async function create(req, res) {
  const data = { ...req.body, slug: await resolveSlug('products', { slug: req.body.slug, source: req.body.name }) };
  const id = await Products.createProduct(data);
  res.status(201).json(await Products.getProduct('id', id, { admin: true }));
}

export async function update(req, res) {
  const id = Number(req.params.id);
  const data = { ...req.body };
  if (data.slug) data.slug = await resolveSlug('products', { slug: data.slug, excludeId: id });
  const ok = await Products.updateProduct(id, data);
  if (!ok) throw notFound('Product not found');
  res.json(await Products.getProduct('id', id, { admin: true }));
}

export async function remove(req, res) {
  if (!(await Products.deleteProduct(Number(req.params.id)))) throw notFound('Product not found');
  res.status(204).end();
}

// ---- partner store import --------------------------------------------------
export async function importPreview(req, res) {
  res.json(await StoreImport.draftFromLink(String(req.body?.url || '')));
}

export async function importFeed(req, res) {
  res.json(await StoreImport.browseFeed(req.query.program_id, { page: req.query.page, q: req.query.q }));
}

export async function importSelected(req, res) {
  const { program_id, handles, category_id, subcategory_id, active, tags } = req.body;
  res.status(201).json(await StoreImport.importProducts({
    programId: program_id, handles, categoryId: category_id, subcategoryId: subcategory_id, active, extraTags: tags,
  }));
}

/** Show or hide many products at once. */
export async function bulkActive(req, res) {
  const { rowCount } = await query('update products set active = $1 where id = any($2)', [req.body.active, req.body.ids]);
  res.json({ updated: rowCount });
}
