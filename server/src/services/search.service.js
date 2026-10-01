import { many } from '../config/db.js';
import { findProducts } from '../models/product.model.js';
import { listGuides, IS_LIVE } from '../models/guide.model.js';
import { IS_CURRENT } from '../models/trend.model.js';

const clean = (q) => String(q || '').trim().slice(0, 100);

/** Fast prefix/substring suggestions across content types for the search box. */
export async function suggest(rawQ) {
  const q = clean(rawQ);
  if (q.length < 2) return [];
  const like = `%${q}%`;
  const prefix = `${q}%`;
  const rows = await many(
    `(select 'guide' as type, g.title as label, '/guides/' || g.slug as url, g.hero_image as image
        from guides g where ${IS_LIVE} and g.title ilike $1
        order by (g.title ilike $2) desc, g.published_at desc limit 4)
     union all
     (select 'category', c.name,
             case when p.slug is null then '/' || c.slug else '/' || p.slug || '/' || c.slug end, c.image_url
        from categories c left join categories p on p.id = c.parent_id
       where c.active and c.name ilike $1 order by (c.name ilike $2) desc limit 3)
     union all
     (select 'trend', t.title, '/trending/' || t.slug, t.image_url
        from trends t where ${IS_CURRENT} and (t.title ilike $1 or t.keyword ilike $1)
        order by t.priority desc limit 3)
     union all
     (select 'product', p.name, '/products/' || p.slug,
             (select url from product_images i where i.product_id = p.id order by sort_order limit 1)
        from products p where p.active and (p.name ilike $1 or p.brand ilike $1)
        order by (p.name ilike $2) desc, p.featured desc limit 5)`,
    [like, prefix],
  );
  return rows;
}

/** Full results page: guides first (they convert best), then products, categories, trends. */
export async function search(rawQ, { type, category, limit = 24 } = {}) {
  const q = clean(rawQ);
  if (!q) return { q, guides: [], products: [], categories: [], trends: [], total: 0 };
  const categoryIds = category ? [Number(category)].filter(Boolean) : undefined;
  const like = `%${q}%`;

  const [guides, products, categories, trends] = await Promise.all([
    !type || type === 'guides' ? listGuides({ q, limit: 12, categoryIds }) : { items: [] },
    !type || type === 'products' ? findProducts({ q, limit, categoryIds }) : { items: [] },
    !type || type === 'categories'
      ? many(
          `select c.id, c.name, c.slug, c.description, c.image_url,
                  case when p.slug is null then '/' || c.slug else '/' || p.slug || '/' || c.slug end as path
             from categories c left join categories p on p.id = c.parent_id
            where c.active and (c.name ilike $1 or c.description ilike $1) order by c.sort_order limit 6`,
          [like],
        )
      : [],
    !type || type === 'trends'
      ? many(
          `select t.id, t.title, t.slug, t.description, t.image_url, t.trend_status
             from trends t where ${IS_CURRENT} and (t.title ilike $1 or t.keyword ilike $1 or t.description ilike $1)
            order by t.priority desc limit 6`,
          [like],
        )
      : [],
  ]);

  return {
    q,
    guides: guides.items,
    products: products.items,
    categories,
    trends,
    total: guides.items.length + products.items.length + categories.length + trends.length,
  };
}
