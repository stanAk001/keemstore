import { many, one, transaction } from '../config/db.js';
import { buildInsert, buildUpdate } from '../utils/sql.js';
import { savePinterest, deletePinterest } from '../services/pinterest.service.js';

const WRITABLE = [
  'title', 'slug', 'keyword', 'description', 'image_url', 'category_id', 'source', 'trend_status',
  'trend_start', 'trend_end', 'priority', 'sort_order', 'active', 'linked_guide_id',
  'linked_category_id', 'linked_url', 'seo', 'growth', 'growth_note', 'measured_at', 'edit',
];

// Active and inside its (optional) schedule window.
export const IS_CURRENT = `t.active and (t.trend_start is null or t.trend_start <= now())
                           and (t.trend_end is null or t.trend_end > now())`;

const SELECT = `
  select t.*, to_char(t.measured_at, 'YYYY-MM-DD') as measured_at, c.name as category_name,
         g.slug as guide_slug, g.title as guide_title,
         lc.name as linked_category_name,
         case when lcp.slug is null then '/' || lc.slug else '/' || lcp.slug || '/' || lc.slug end as linked_category_path,
         ${IS_CURRENT} as is_current
    from trends t
    left join categories c on c.id = t.category_id
    left join guides g on g.id = t.linked_guide_id
    left join categories lc on lc.id = t.linked_category_id
    left join categories lcp on lcp.id = lc.parent_id`;

/** Where a trend card should send people. Explicit URL > guide > category > its own page. */
function withHref(t) {
  let href = `/trending/${t.slug}`;
  if (t.linked_url) href = t.linked_url;
  else if (t.guide_slug) href = `/guides/${t.guide_slug}`;
  else if (t.linked_category_id && t.linked_category_path) href = t.linked_category_path;
  return { ...t, href, page_url: `/trending/${t.slug}` };
}

export async function listTrends({ admin = false, limit = 50, status, ids } = {}) {
  const clauses = [];
  const params = [];
  if (!admin) clauses.push(IS_CURRENT);
  if (status) {
    params.push(status);
    clauses.push(`t.trend_status = $${params.length}`);
  }
  if (ids?.length) {
    params.push(ids);
    clauses.push(`t.id = any($${params.length})`);
  }
  params.push(Math.min(Number(limit) || 50, 200));
  const rows = await many(
    `${SELECT} ${clauses.length ? `where ${clauses.join(' and ')}` : ''}
     order by t.sort_order, t.priority desc, t.id limit $${params.length}`,
    params,
  );
  const items = rows.map(withHref);
  if (ids?.length) {
    const byId = new Map(items.map((t) => [t.id, t]));
    return ids.map((id) => byId.get(Number(id))).filter(Boolean);
  }
  return items;
}

export async function getTrend(by, value, { admin = false } = {}) {
  const col = by === 'slug' ? 't.slug' : 't.id';
  const row = await one(`${SELECT} where ${col} = $1 ${admin ? '' : 'and t.active'}`, [value]);
  return row ? withHref(row) : null;
}

export async function createTrend(data) {
  return transaction(async (client) => {
    const ins = buildInsert('trends', data, WRITABLE, ['seo']);
    const { rows } = await client.query(ins.text, ins.values);
    if (data.pinterest) await savePinterest(client, 'trend', rows[0].id, data.pinterest);
    return rows[0].id;
  });
}

export async function updateTrend(id, data) {
  return transaction(async (client) => {
    const upd = buildUpdate('trends', id, data, WRITABLE, ['seo']);
    if (upd && !(await client.query(upd.text, upd.values)).rowCount) return null;
    if (data.pinterest) await savePinterest(client, 'trend', id, data.pinterest);
    return id;
  });
}

export async function deleteTrend(id) {
  return transaction(async (client) => {
    await deletePinterest(client, 'trend', id);
    return (await client.query('delete from trends where id = $1', [id])).rowCount > 0;
  });
}

export async function reorderTrends(ids) {
  await transaction(async (client) => {
    for (const [i, id] of ids.entries()) await client.query('update trends set sort_order = $1 where id = $2', [i, id]);
  });
}
