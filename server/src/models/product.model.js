import { many, one, query, transaction } from '../config/db.js';
import { buildInsert, buildUpdate, Where } from '../utils/sql.js';
import { withOutbound } from '../services/affiliate.service.js';
import { getSettings } from '../services/settings.service.js';

const WRITABLE = [
  'name', 'slug', 'brand', 'short_description', 'description', 'category_id', 'subcategory_id',
  'amazon_url', 'affiliate_url', 'asin', 'current_price', 'price_display', 'price_source',
  'price_checked_at', 'rating', 'review_count', 'rating_source', 'rating_checked_at', 'pros', 'cons',
  'best_for', 'not_for', 'gift_note', 'gift_rank', 'editor_note', 'tags', 'placement', 'featured', 'active', 'is_demo',
];
const JSON_COLS = ['pros', 'cons'];

const SELECT = `
  select p.id, p.name, p.slug, p.brand, p.short_description, p.description, p.category_id,
         p.subcategory_id, p.amazon_url, p.affiliate_url, p.asin, p.current_price, p.price_display,
         p.price_source, p.price_checked_at, p.rating, p.review_count, p.rating_source,
         p.rating_checked_at, p.pros, p.cons, p.best_for, p.not_for, p.gift_note, p.gift_rank, p.editor_note, p.tags,
         p.placement, p.featured, p.active, p.is_demo, p.created_at, p.updated_at,
         c.name as category_name, c.slug as category_slug, cp.slug as category_parent_slug,
         sc.name as subcategory_name, sc.slug as subcategory_slug,
         coalesce((select json_agg(json_build_object('url', i.url, 'alt', i.alt, 'credit', i.credit)
                                   order by i.sort_order, i.id)
                     from product_images i where i.product_id = p.id), '[]') as images,
         coalesce((select json_agg(json_build_object('id', l.id, 'program_id', l.program_id, 'url', l.url,
                                                     'label', l.label, 'is_primary', l.is_primary,
                                                     'active', l.active) order by l.is_primary desc, l.id)
                     from affiliate_links l where l.product_id = p.id), '[]') as affiliate_links
    from products p
    left join categories c on c.id = p.category_id
    left join categories cp on cp.id = c.parent_id
    left join categories sc on sc.id = p.subcategory_id`;

function categoryPath(row) {
  if (row.subcategory_slug && row.category_slug) return `/${row.category_slug}/${row.subcategory_slug}`;
  if (!row.category_slug) return null;
  return row.category_parent_slug ? `/${row.category_parent_slug}/${row.category_slug}` : `/${row.category_slug}`;
}

const PRICE_FIELDS = ['current_price', 'price_display', 'price_source', 'price_checked_at'];
const RATING_FIELDS = ['rating', 'review_count', 'rating_source', 'rating_checked_at'];

/**
 * Shape for public consumers: adds outbound link, category path, primary image.
 * Prices/ratings are removed from public responses unless enabled in settings
 * (they are still used server-side for filters and sorting).
 */
async function present(rows, { admin = false } = {}) {
  const [withLinks, settings] = await Promise.all([withOutbound(rows), getSettings()]);
  const hide = [
    ...(admin || settings.affiliate.show_prices ? [] : PRICE_FIELDS),
    ...(admin || settings.affiliate.show_ratings ? [] : RATING_FIELDS),
  ];
  return withLinks.map((p) => {
    const out = { ...p, category_path: categoryPath(p), image: p.images[0] || null };
    if (!admin) {
      delete out.affiliate_links;
      delete out.affiliate_url;
      for (const f of hide) delete out[f];
    }
    return out;
  });
}

export const SORTS = {
  featured: 'p.featured desc, p.updated_at desc',
  gift: 'p.gift_rank asc nulls last, p.featured desc, p.updated_at desc',
  newest: 'p.created_at desc',
  price_asc: 'p.current_price asc nulls last, p.id',
  price_desc: 'p.current_price desc nulls last, p.id',
  name: 'p.name asc',
};

/**
 * Flexible product finder used by category pages, sections and admin lists.
 * categoryIds matches either the category or subcategory column.
 */
export async function findProducts(f = {}, { admin = false } = {}) {
  const w = new Where();
  if (!admin || f.activeOnly) w.add('p.active = true');
  if (admin && f.active !== undefined && f.active !== '') w.add('p.active = ?', f.active === 'true' || f.active === true);
  if (f.ids?.length) w.add('p.id = any(?)', f.ids);
  if (f.excludeIds?.length) w.add('not (p.id = any(?))', f.excludeIds);
  // A product appears in a category via its category/subcategory, or by carrying
  // that category's slug as a tag (e.g. 'gifts') — so one product can be cross-listed.
  if (f.categoryIds?.length) {
    w.add(
      `(p.category_id = any(?) or p.subcategory_id = any(?)
        or p.tags && (select coalesce(array_agg(slug), '{}') from categories where id = any(?)))`,
      f.categoryIds, f.categoryIds, f.categoryIds,
    );
  }
  if (f.brands?.length) w.add('lower(p.brand) = any(?)', f.brands.map((b) => b.toLowerCase()));
  if (f.tags?.length) w.add('p.tags && ?', f.tags);
  if (f.minPrice != null && f.minPrice !== '') w.add('p.current_price >= ?', Number(f.minPrice));
  if (f.maxPrice != null && f.maxPrice !== '') w.add('p.current_price <= ?', Number(f.maxPrice));
  if (f.featured) w.add('p.featured = true');
  if (f.demo !== undefined && f.demo !== '') w.add('p.is_demo = ?', f.demo === 'true' || f.demo === true);
  if (f.missingLinks) {
    w.add(`p.amazon_url is null and p.affiliate_url is null and p.asin is null
           and not exists (select 1 from affiliate_links l where l.product_id = p.id and l.active)`);
  }
  if (f.q) {
    const term = String(f.q).slice(0, 100);
    const tag = term.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-');
    // Text match, or the product sits in a matching category / carries a matching tag.
    w.add(
      `(p.search @@ websearch_to_tsquery('english', ?) or p.name ilike ? or p.brand ilike ? or ? = any(p.tags)
        or exists (select 1 from categories k where k.id in (p.category_id, p.subcategory_id) and k.name ilike ?))`,
      term, `%${term}%`, `%${term}%`, tag, `%${term}%`,
    );
  }

  const order = SORTS[f.sort] || SORTS.featured;
  const limit = Math.min(Number(f.limit) || 24, 200);
  const offset = Number(f.offset) || 0;

  const [rows, count] = await Promise.all([
    many(`${SELECT} ${w} order by ${order} limit ${limit} offset ${offset}`, w.values),
    one(`select count(*)::int as total from products p ${w}`, w.values),
  ]);
  return { items: await present(rows, { admin }), total: count.total };
}

/** Fetch products by id, preserving the order of `ids`. */
export async function getProductsByIds(ids, { admin = false, activeOnly = true } = {}) {
  const unique = [...new Set(ids.map(Number).filter(Boolean))];
  if (!unique.length) return [];
  const rows = await many(`${SELECT} where p.id = any($1) ${activeOnly ? 'and p.active' : ''}`, [unique]);
  const byId = new Map((await present(rows, { admin })).map((p) => [p.id, p]));
  return unique.map((id) => byId.get(id)).filter(Boolean);
}

export async function getProduct(by, value, { admin = false } = {}) {
  const col = by === 'slug' ? 'p.slug' : 'p.id';
  const row = await one(`${SELECT} where ${col} = $1 ${admin ? '' : 'and p.active'}`, [value]);
  if (!row) return null;
  const [product] = await present([row], { admin });
  return product;
}

/** Guides a product appears in (published only unless admin). */
export async function guidesForProduct(productId, { admin = false } = {}) {
  return many(
    `select g.id, g.title, g.slug, g.status, g.hero_image, gp.label
       from guide_products gp join guides g on g.id = gp.guide_id
      where gp.product_id = $1 ${admin ? '' : "and g.status in ('published','scheduled') and (g.published_at is null or g.published_at <= now())"}
      order by g.published_at desc nulls last`,
    [productId],
  );
}

export async function facetsForCategories(categoryIds) {
  const params = [categoryIds];
  const scope = `p.active and (p.category_id = any($1) or p.subcategory_id = any($1)
    or p.tags && (select coalesce(array_agg(slug), '{}') from categories where id = any($1)))`;
  const [brands, tags, price] = await Promise.all([
    many(`select brand, count(*)::int as count from products p where ${scope} and brand is not null
          group by brand order by count desc, brand limit 30`, params),
    many(`select tag, count(*)::int as count from products p, unnest(p.tags) tag where ${scope}
          group by tag order by count desc, tag limit 30`, params),
    one(`select min(current_price) as min, max(current_price) as max from products p where ${scope}`, params),
  ]);
  return { brands, tags, price };
}

async function writeRelations(client, productId, data) {
  if (data.images) {
    await client.query('delete from product_images where product_id = $1', [productId]);
    for (const [i, img] of data.images.entries()) {
      await client.query(
        'insert into product_images (product_id, url, alt, credit, sort_order) values ($1, $2, $3, $4, $5)',
        [productId, img.url, img.alt ?? null, img.credit ?? null, i],
      );
    }
  }
  if (data.affiliate_links) {
    const keep = data.affiliate_links.filter((l) => l.id).map((l) => l.id);
    await client.query('delete from affiliate_links where product_id = $1 and not (id = any($2))', [productId, keep]);
    // Clear primaries first so the partial unique index is never violated mid-update.
    await client.query('update affiliate_links set is_primary = false where product_id = $1', [productId]);
    let primarySet = false;
    for (const link of data.affiliate_links) {
      const isPrimary = link.is_primary && !primarySet;
      if (isPrimary) primarySet = true;
      if (link.id) {
        await client.query(
          `update affiliate_links set program_id = $1, url = $2, label = $3, is_primary = $4, active = $5
            where id = $6 and product_id = $7`,
          [link.program_id, link.url, link.label ?? null, isPrimary, link.active, link.id, productId],
        );
      } else {
        await client.query(
          `insert into affiliate_links (product_id, program_id, url, label, is_primary, active)
           values ($1, $2, $3, $4, $5, $6)`,
          [productId, link.program_id, link.url, link.label ?? null, isPrimary, link.active],
        );
      }
    }
  }
}

export async function createProduct(data) {
  return transaction(async (client) => {
    const ins = buildInsert('products', data, WRITABLE, JSON_COLS);
    const { rows } = await client.query(ins.text, ins.values);
    await writeRelations(client, rows[0].id, data);
    return rows[0].id;
  });
}

export async function updateProduct(id, data) {
  return transaction(async (client) => {
    const upd = buildUpdate('products', id, data, WRITABLE, JSON_COLS);
    if (upd) {
      const { rowCount } = await client.query(upd.text, upd.values);
      if (!rowCount) return null;
    }
    await writeRelations(client, id, data);
    return id;
  });
}

export async function deleteProduct(id) {
  const { rowCount } = await query('delete from products where id = $1', [id]);
  return rowCount > 0;
}
