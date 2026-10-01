import * as Categories from '../models/category.model.js';
import { findProducts, facetsForCategories } from '../models/product.model.js';
import { listGuides } from '../models/guide.model.js';
import { listTrends } from '../models/trend.model.js';
import { resolveSlug } from '../utils/uniqueSlug.js';
import { badRequest, notFound } from '../utils/httpError.js';
import { paginate, pageMeta } from '../utils/sql.js';

const list = (v) => (v ? String(v).split(',').map((s) => s.trim()).filter(Boolean) : undefined);

// ---- public ---------------------------------------------------------------
export async function tree(_req, res) {
  res.json(await Categories.categoryTree());
}

/**
 * Everything a category page needs in one request:
 * category, children, filtered products, facets, guides and trends.
 */
export async function byPath(req, res) {
  const [parentSlug, childSlug] = String(req.query.path || '').split('/').filter(Boolean);
  if (!parentSlug) throw badRequest('path is required');
  const category = await Categories.getCategoryByPath(parentSlug, childSlug);
  if (!category) throw notFound('Category not found');

  const children = await Categories.childrenOf(category.id);
  const scopeIds = [category.id, ...children.map((c) => c.id)];
  // ?sub= narrows to one child category.
  const sub = req.query.sub ? children.find((c) => c.slug === req.query.sub) : null;
  const productScope = sub ? [sub.id] : scopeIds;

  const pg = paginate(req.query, { defaultLimit: 24, maxLimit: 60 });
  const [products, facets, guides, trends] = await Promise.all([
    findProducts({
      categoryIds: productScope,
      brands: list(req.query.brand),
      tags: list(req.query.tag),
      minPrice: req.query.min_price,
      maxPrice: req.query.max_price,
      featured: req.query.featured === 'true',
      sort: req.query.sort,
      limit: pg.limit,
      offset: pg.offset,
    }),
    facetsForCategories(scopeIds),
    listGuides({ categoryIds: scopeIds, limit: 6 }),
    listTrends({ limit: 50 }),
  ]);

  let parent = null;
  if (category.parent_id) parent = await Categories.getCategory(category.parent_id);

  res.json({
    category,
    parent: parent && { id: parent.id, name: parent.name, slug: parent.slug, path: parent.path },
    children,
    products: { items: products.items, ...pageMeta(products.total, pg) },
    facets,
    guides: guides.items,
    trends: trends.filter((t) => scopeIds.includes(t.category_id) || scopeIds.includes(t.linked_category_id)).slice(0, 6),
  });
}

// ---- admin ----------------------------------------------------------------
export async function listAdmin(_req, res) {
  res.json(await Categories.listCategories({ admin: true }));
}

async function checkParent(id, parentId) {
  if (!parentId) return;
  if (id && Number(parentId) === Number(id)) throw badRequest('A category cannot be its own parent');
  const parent = await Categories.getCategory(parentId);
  if (!parent) throw badRequest('Parent category not found');
  if (parent.parent_id) throw badRequest('Only two levels are supported: choose a top-level parent');
}

export async function create(req, res) {
  await checkParent(null, req.body.parent_id);
  const slug = await resolveSlug('categories', { slug: req.body.slug, source: req.body.name, reserved: !req.body.parent_id });
  const row = await Categories.createCategory({ ...req.body, slug });
  res.status(201).json(await Categories.getCategory(row.id));
}

export async function update(req, res) {
  const id = Number(req.params.id);
  await checkParent(id, req.body.parent_id);
  const data = { ...req.body };
  if (data.slug) data.slug = await resolveSlug('categories', { slug: data.slug, excludeId: id, reserved: !data.parent_id });
  const row = await Categories.updateCategory(id, data);
  if (!row) throw notFound('Category not found');
  res.json(await Categories.getCategory(id));
}

export async function remove(req, res) {
  if (!(await Categories.deleteCategory(Number(req.params.id)))) throw notFound('Category not found');
  res.status(204).end();
}

export async function reorder(req, res) {
  await Categories.reorderCategories(req.body.ids);
  res.json({ ok: true });
}
