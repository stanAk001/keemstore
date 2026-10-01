// Turns stored section configs (ids + options) into render-ready data.
// Used by the homepage builder and seasonal landing pages so both share one
// set of predefined, design-consistent section types.
import { findProducts, getProductsByIds } from '../models/product.model.js';
import { listGuides, getGuidesByIds } from '../models/guide.model.js';
import { getCategoriesByIds, featuredCategories } from '../models/category.model.js';
import { listTrends } from '../models/trend.model.js';
import { getCollection } from '../models/collection.model.js';
import { currentSeasonalPage, getSeasonalPage } from '../models/seasonal.model.js';

const ids = (v) => (Array.isArray(v) ? v.map(Number).filter(Boolean) : []);

/**
 * Product source options (config.source):
 *   manual (product_ids) | collection (collection_id) | featured | latest |
 *   category (category_id) | tag (tag) | under_price (max_price)
 */
async function resolveProducts(config) {
  const limit = Math.min(Number(config.limit) || 8, 24);
  const source = config.source || (ids(config.product_ids).length ? 'manual' : 'featured');
  switch (source) {
    case 'manual':
      return getProductsByIds(ids(config.product_ids));
    case 'collection': {
      const c = config.collection_id ? await getCollection('id', config.collection_id) : null;
      return c ? c.products.slice(0, limit) : [];
    }
    case 'latest':
      return (await findProducts({ sort: 'newest', limit })).items;
    case 'category':
      return (await findProducts({ categoryIds: ids([config.category_id]), limit })).items;
    case 'tag':
      return (await findProducts({ tags: [String(config.tag || '').toLowerCase()], limit })).items;
    case 'under_price':
      return (await findProducts({ maxPrice: Number(config.max_price) || 25, sort: 'featured', limit })).items;
    default:
      return (await findProducts({ featured: true, limit })).items;
  }
}

async function resolveGuides(config) {
  const limit = Math.min(Number(config.limit) || 3, 12);
  if (ids(config.guide_ids).length) return getGuidesByIds(ids(config.guide_ids));
  const categoryIds = ids(config.category_ids ?? (config.category_id ? [config.category_id] : []));
  return (await listGuides({ categoryIds, limit, sort: config.sort || 'latest' })).items;
}

const resolvers = {
  // The hero's ticker shows current trends unless switched off in the admin.
  hero: async (c) => ({ trends: c.show_ticker === false ? [] : await listTrends({ limit: 12 }) }),
  text: async () => ({}),
  links: async () => ({}),
  newsletter: async () => ({}),

  trending: async (c) => ({
    trends: ids(c.trend_ids).length ? await listTrends({ ids: ids(c.trend_ids) }) : await listTrends({ limit: Number(c.limit) || 8 }),
  }),

  categories: async (c) => ({
    categories: ids(c.category_ids).length ? await getCategoriesByIds(ids(c.category_ids)) : await featuredCategories(),
  }),

  featured_guide: async (c) => {
    const [guide] = c.guide_id
      ? await getGuidesByIds([c.guide_id])
      : (await listGuides({ featured: true, limit: 1 })).items;
    return { guide: guide || null };
  },

  products: async (c) => ({ products: await resolveProducts(c) }),
  guides: async (c) => ({ guides: await resolveGuides(c) }),
  latest_guides: async (c) => ({ guides: (await listGuides({ limit: Number(c.limit) || 6, sort: 'latest' })).items }),

  // Two editorial panels (e.g. Women / Men), each with a few products from its category.
  split_fashion: async (c) => {
    const panels = Array.isArray(c.panels) ? c.panels.slice(0, 2) : [];
    const categories = await getCategoriesByIds(panels.map((p) => p.category_id).filter(Boolean));
    const byId = new Map(categories.map((x) => [x.id, x]));
    return {
      panels: await Promise.all(
        panels.map(async (p) => {
          const cat = byId.get(Number(p.category_id));
          const products = cat ? (await findProducts({ categoryIds: [cat.id], limit: Number(c.per_panel) || 3 })).items : [];
          return { ...p, category: cat || null, url: p.url || cat?.path || null, products };
        }),
      ),
    };
  },

  // Category tiles + a product rail drawn from those categories.
  creator: async (c) => {
    const categories = await getCategoriesByIds(ids(c.category_ids));
    const products = ids(c.product_ids).length
      ? await getProductsByIds(ids(c.product_ids))
      : (await findProducts({ categoryIds: categories.map((x) => x.id), limit: Number(c.limit) || 4 })).items;
    return { categories, products };
  },

  seasonal: async (c) => {
    const page = c.seasonal_page_id ? await getSeasonalPage('id', c.seasonal_page_id) : await currentSeasonalPage();
    if (!page) return { page: null, products: [] };
    const tag = c.tag || page.slug;
    const products = ids(c.product_ids).length
      ? await getProductsByIds(ids(c.product_ids))
      : (await findProducts({ tags: [tag], limit: Number(c.limit) || 4 })).items;
    // Trends belong to the season if they link to its page or mention its title.
    const title = page.title.toLowerCase();
    const trends = ids(c.trend_ids).length
      ? await listTrends({ ids: ids(c.trend_ids) })
      : (await listTrends({ limit: 50 })).filter(
          (t) => t.linked_url?.startsWith(`/seasonal/${page.slug}`) || t.title.toLowerCase().includes(title),
        );
    const { sections, ...summary } = page;
    return { page: summary, products, trends: trends.slice(0, 6) };
  },
};

export async function resolveSection(section) {
  const resolver = resolvers[section.type];
  if (!resolver) return null;
  const config = section.config || {};
  const data = await resolver(config);
  return { id: section.id, key: section.key, type: section.type, title: section.title, subtitle: section.subtitle, config, data };
}

/** Resolve many sections concurrently, dropping ones that end up with nothing to show. */
export async function resolveSections(sections) {
  const resolved = await Promise.all(sections.filter((s) => s.enabled !== false).map(resolveSection));
  return resolved.filter((s) => {
    if (!s) return false;
    const d = s.data;
    if (s.type === 'products') return d.products.length > 0;
    if (s.type === 'guides' || s.type === 'latest_guides') return d.guides.length > 0;
    if (s.type === 'trending') return d.trends.length > 0;
    if (s.type === 'categories') return d.categories.length > 0;
    if (s.type === 'featured_guide') return Boolean(d.guide);
    if (s.type === 'seasonal') return Boolean(d.page);
    return true;
  });
}
