import { many, one, query, transaction } from '../config/db.js';
import { buildInsert, buildUpdate } from '../utils/sql.js';

const WRITABLE = ['name', 'slug', 'parent_id', 'description', 'intro', 'image_url', 'image_alt', 'seo', 'featured', 'active', 'sort_order'];
const JSON_COLS = ['seo'];

const SELECT = `
  select c.*, p.slug as parent_slug, p.name as parent_name,
         case when p.slug is null then '/' || c.slug else '/' || p.slug || '/' || c.slug end as path,
         (select count(*)::int from products pr
           where pr.active and (pr.category_id = c.id or pr.subcategory_id = c.id or c.slug = any(pr.tags)
             or pr.category_id in (select id from categories k where k.parent_id = c.id))) as product_count
    from categories c left join categories p on p.id = c.parent_id`;

export async function listCategories({ admin = false } = {}) {
  return many(`${SELECT} ${admin ? '' : 'where c.active and (p.id is null or p.active)'}
               order by coalesce(p.sort_order, c.sort_order), coalesce(p.id, c.id), c.parent_id nulls first, c.sort_order, c.name`);
}

/** Nested tree of active categories, used for navigation and filters. */
export async function categoryTree() {
  const rows = await listCategories();
  const top = rows.filter((r) => !r.parent_id);
  return top.map((t) => ({ ...t, children: rows.filter((r) => r.parent_id === t.id) }));
}

export async function getCategory(id) {
  return one(`${SELECT} where c.id = $1`, [id]);
}

/** Resolve "/parent/child" or "/slug" to an active category. */
export async function getCategoryByPath(parentSlug, childSlug) {
  if (childSlug) {
    return one(`${SELECT} where c.slug = $1 and p.slug = $2 and c.active and p.active`, [childSlug, parentSlug]);
  }
  return one(`${SELECT} where c.slug = $1 and c.parent_id is null and c.active`, [parentSlug]);
}

export async function childrenOf(id) {
  return many(`${SELECT} where c.parent_id = $1 and c.active order by c.sort_order, c.name`, [id]);
}

export async function getCategoriesByIds(ids) {
  if (!ids?.length) return [];
  const rows = await many(`${SELECT} where c.id = any($1) and c.active`, [ids]);
  const byId = new Map(rows.map((r) => [r.id, r]));
  return ids.map((id) => byId.get(Number(id))).filter(Boolean);
}

export async function featuredCategories(limit = 8) {
  return many(`${SELECT} where c.active and c.featured order by c.sort_order limit $1`, [limit]);
}

export async function createCategory(data) {
  const ins = buildInsert('categories', data, WRITABLE, JSON_COLS);
  return one(ins.text, ins.values);
}

export async function updateCategory(id, data) {
  const upd = buildUpdate('categories', id, data, WRITABLE, JSON_COLS);
  return upd ? one(upd.text, upd.values) : getCategory(id);
}

export async function deleteCategory(id) {
  const { rowCount } = await query('delete from categories where id = $1', [id]);
  return rowCount > 0;
}

export async function reorderCategories(ids) {
  await transaction(async (client) => {
    for (const [i, id] of ids.entries()) {
      await client.query('update categories set sort_order = $1 where id = $2', [i, id]);
    }
  });
}
