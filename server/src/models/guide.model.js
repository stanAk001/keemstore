import { many, one, query, transaction } from '../config/db.js';
import { buildInsert, buildUpdate, Where } from '../utils/sql.js';
import { getProductsByIds } from './product.model.js';
import { savePinterest, pinterestFor, deletePinterest } from '../services/pinterest.service.js';

const WRITABLE = [
  'title', 'slug', 'subtitle', 'excerpt', 'quick_answer', 'hero_image', 'hero_image_alt', 'hero_motion', 'author_id',
  'primary_category_id', 'status', 'published_at', 'content', 'pros', 'cons', 'buying_considerations',
  'faq', 'featured', 'seo',
];
const JSON_COLS = ['content', 'pros', 'cons', 'buying_considerations', 'faq', 'seo'];

// Scheduled guides go live automatically once their publish time passes.
export const IS_LIVE = `(g.status in ('published', 'scheduled') and g.published_at is not null and g.published_at <= now())`;

const CARD = `
  select g.id, g.title, g.slug, g.subtitle, g.excerpt, g.hero_image, g.hero_image_alt, g.hero_motion, g.status,
         g.published_at, g.updated_at, g.created_at, g.featured, g.is_demo,
         c.name as category_name, c.slug as category_slug,
         case when cp.slug is null then '/' || c.slug else '/' || cp.slug || '/' || c.slug end as category_path,
         u.display_name as author_name,
         (select count(*)::int from guide_products gp where gp.guide_id = g.id) as product_count
    from guides g
    left join categories c on c.id = g.primary_category_id
    left join categories cp on cp.id = c.parent_id
    left join users u on u.id = g.author_id`;

export async function listGuides(f = {}, { admin = false } = {}) {
  const w = new Where();
  if (!admin) w.add(IS_LIVE);
  if (admin && f.status) w.add('g.status = ?', f.status);
  if (f.featured) w.add('g.featured = true');
  if (f.ids?.length) w.add('g.id = any(?)', f.ids);
  if (f.excludeIds?.length) w.add('not (g.id = any(?))', f.excludeIds);
  if (f.categoryIds?.length) {
    w.add(`(g.primary_category_id = any(?) or exists (select 1 from guide_categories gc
             where gc.guide_id = g.id and gc.category_id = any(?)))`, f.categoryIds, f.categoryIds);
  }
  if (f.q) {
    const term = String(f.q).slice(0, 100);
    w.add(`(g.search @@ websearch_to_tsquery('english', ?) or g.title ilike ?)`, term, `%${term}%`);
  }
  const limit = Math.min(Number(f.limit) || 12, 200);
  const offset = Number(f.offset) || 0;
  const order = admin ? 'g.updated_at desc' : 'g.featured desc, g.published_at desc';
  const orderBy = f.sort === 'latest' ? 'g.published_at desc nulls last' : order;

  const [items, count] = await Promise.all([
    many(`${CARD} ${w} order by ${orderBy} limit ${limit} offset ${offset}`, w.values),
    one(`select count(*)::int as total from guides g ${w}`, w.values),
  ]);
  return { items, total: count.total };
}

export async function getGuidesByIds(ids, { admin = false } = {}) {
  if (!ids?.length) return [];
  const { items } = await listGuides({ ids, limit: ids.length }, { admin });
  const byId = new Map(items.map((g) => [g.id, g]));
  return ids.map((id) => byId.get(Number(id))).filter(Boolean);
}

/** Collect product ids referenced from content blocks so the page can render them. */
function productIdsInBlocks(blocks = []) {
  const ids = [];
  for (const b of blocks) {
    if (b.productId) ids.push(b.productId);
    if (Array.isArray(b.productIds)) ids.push(...b.productIds);
  }
  return ids.map(Number).filter(Boolean);
}

/** Full guide with products, categories, related guides and Pinterest data. */
export async function getGuideFull(by, value, { admin = false, includeDrafts = false } = {}) {
  const col = by === 'slug' ? 'g.slug' : 'g.id';
  const guide = await one(
    `select g.*, c.name as category_name, c.slug as category_slug,
            case when cp.slug is null then '/' || c.slug else '/' || cp.slug || '/' || c.slug end as category_path,
            cp.name as category_parent_name,
            case when cp.slug is null then null else '/' || cp.slug end as category_parent_path,
            u.display_name as author_name, u.bio as author_bio, u.avatar_url as author_avatar,
            ${IS_LIVE} as is_live
       from guides g
       left join categories c on c.id = g.primary_category_id
       left join categories cp on cp.id = c.parent_id
       left join users u on u.id = g.author_id
      where ${col} = $1 ${includeDrafts ? '' : `and ${IS_LIVE}`}`,
    [value],
  );
  if (!guide) return null;
  delete guide.search;

  const [picks, categories, related, pinterest] = await Promise.all([
    many('select product_id, position, label, note, is_primary from guide_products where guide_id = $1 order by position', [guide.id]),
    many(`select c.id, c.name, c.slug from guide_categories gc join categories c on c.id = gc.category_id
           where gc.guide_id = $1 order by c.name`, [guide.id]),
    many('select related_guide_id from guide_related where guide_id = $1 order by position', [guide.id]),
    pinterestFor('guide', guide.id),
  ]);

  const blockIds = [...productIdsInBlocks(guide.content), ...productIdsInBlocks(guide.buying_considerations)];
  const products = await getProductsByIds([...picks.map((p) => p.product_id), ...blockIds], { admin, activeOnly: !admin });
  const productMap = Object.fromEntries(products.map((p) => [p.id, p]));

  let relatedGuides = await getGuidesByIds(related.map((r) => r.related_guide_id), { admin: false });
  if (!admin && relatedGuides.length < 3 && guide.primary_category_id) {
    // Fill with other guides from the same category so the section is never empty.
    const { items } = await listGuides({
      categoryIds: [guide.primary_category_id],
      excludeIds: [guide.id, ...relatedGuides.map((g) => g.id)],
      limit: 3 - relatedGuides.length,
    });
    relatedGuides = [...relatedGuides, ...items];
  }

  return {
    ...guide,
    picks: picks.filter((p) => productMap[p.product_id]),
    products: productMap,
    categories,
    category_ids: categories.map((c) => c.id),
    related_guide_ids: related.map((r) => r.related_guide_id),
    related_guides: relatedGuides,
    pinterest,
  };
}

async function writeRelations(client, guideId, data) {
  if (data.category_ids) {
    await client.query('delete from guide_categories where guide_id = $1', [guideId]);
    for (const cid of new Set(data.category_ids)) {
      await client.query('insert into guide_categories (guide_id, category_id) values ($1, $2)', [guideId, cid]);
    }
  }
  if (data.products) {
    await client.query('delete from guide_products where guide_id = $1', [guideId]);
    const seen = new Set();
    let pos = 0;
    for (const p of data.products) {
      if (seen.has(p.product_id)) continue;
      seen.add(p.product_id);
      await client.query(
        `insert into guide_products (guide_id, product_id, position, label, note, is_primary)
         values ($1, $2, $3, $4, $5, $6)`,
        [guideId, p.product_id, pos++, p.label ?? null, p.note ?? null, Boolean(p.is_primary)],
      );
    }
  }
  if (data.related_guide_ids) {
    await client.query('delete from guide_related where guide_id = $1', [guideId]);
    for (const [i, rid] of [...new Set(data.related_guide_ids)].entries()) {
      if (rid === guideId) continue;
      await client.query('insert into guide_related (guide_id, related_guide_id, position) values ($1, $2, $3)', [guideId, rid, i]);
    }
  }
  if (data.pinterest) await savePinterest(client, 'guide', guideId, data.pinterest);
}

function normaliseStatus(data) {
  // Publishing without a date means "now"; scheduling requires a future date.
  if (data.status === 'published' && !data.published_at) data.published_at = new Date().toISOString();
}

export async function createGuide(data) {
  normaliseStatus(data);
  return transaction(async (client) => {
    const ins = buildInsert('guides', data, WRITABLE, JSON_COLS);
    const { rows } = await client.query(ins.text, ins.values);
    await writeRelations(client, rows[0].id, data);
    return rows[0].id;
  });
}

export async function updateGuide(id, data) {
  normaliseStatus(data);
  return transaction(async (client) => {
    const upd = buildUpdate('guides', id, data, WRITABLE, JSON_COLS);
    if (upd) {
      const { rowCount } = await client.query(upd.text, upd.values);
      if (!rowCount) return null;
    }
    await writeRelations(client, id, data);
    return id;
  });
}

export async function duplicateGuide(id, userId) {
  return transaction(async (client) => {
    const { rows } = await client.query('select * from guides where id = $1', [id]);
    const src = rows[0];
    if (!src) return null;
    let slug = `${src.slug}-copy`;
    for (let n = 2; (await client.query('select 1 from guides where slug = $1', [slug])).rowCount; n++) {
      slug = `${src.slug}-copy-${n}`;
    }
    const copy = { ...src, title: `${src.title} (copy)`, slug, status: 'draft', published_at: null, featured: false, author_id: userId ?? src.author_id };
    const ins = buildInsert('guides', copy, WRITABLE, JSON_COLS);
    const { rows: created } = await client.query(ins.text, ins.values);
    const newId = created[0].id;
    await client.query(`insert into guide_products (guide_id, product_id, position, label, note, is_primary)
                        select $1, product_id, position, label, note, is_primary from guide_products where guide_id = $2`, [newId, id]);
    await client.query('insert into guide_categories select $1, category_id from guide_categories where guide_id = $2', [newId, id]);
    await client.query(`insert into guide_related select $1, related_guide_id, position from guide_related
                         where guide_id = $2 and related_guide_id <> $1`, [newId, id]);
    return newId;
  });
}

export async function deleteGuide(id) {
  return transaction(async (client) => {
    await deletePinterest(client, 'guide', id);
    const { rowCount } = await client.query('delete from guides where id = $1', [id]);
    return rowCount > 0;
  });
}

export async function guideStatusCounts() {
  return one(`select count(*)::int as total,
                     count(*) filter (where status = 'published')::int as published,
                     count(*) filter (where status = 'draft')::int as draft,
                     count(*) filter (where status = 'scheduled')::int as scheduled,
                     count(*) filter (where status = 'archived')::int as archived
                from guides`);
}

export async function setGuideStatus(id, status) {
  const data = { status };
  normaliseStatus(data);
  const { rows } = await query(
    `update guides set status = $1, published_at = coalesce($2::timestamptz, published_at) where id = $3 returning id`,
    [status, data.published_at ?? null, id],
  );
  return rows[0] || null;
}
