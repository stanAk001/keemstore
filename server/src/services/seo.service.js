// sitemap.xml, robots.txt and crawler "share pages".
//
// The React app sets meta tags client-side, which Google renders but Pinterest,
// Facebook, X, Slack etc. do not. vercel.json rewrites requests from those
// crawlers to /share/<path>, which returns a small HTML document with the
// correct Open Graph / Twitter / Pinterest tags and a link to the real page.
import { many, one } from '../config/db.js';
import { env } from '../config/env.js';
import { getSettings } from './settings.service.js';
import { IS_LIVE } from '../models/guide.model.js';
import { IS_CURRENT } from '../models/trend.model.js';
import { sizedImage, stillImage } from '../utils/images.js';

const STATIC_PAGES = ['about', 'contact', 'affiliate-disclosure', 'editorial-policy', 'privacy', 'terms'];

const esc = (s = '') =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const notNoindex = (alias) => `coalesce((${alias}.seo->>'noindex')::boolean, false) = false`;

export async function buildSitemap() {
  const base = env.clientUrl;
  const [guides, categories, trends, seasonal, collections, products, pages] = await Promise.all([
    many(`select slug, updated_at from guides g where ${IS_LIVE} and ${notNoindex('g')} order by published_at desc`),
    many(`select case when p.slug is null then '/' || c.slug else '/' || p.slug || '/' || c.slug end as path, c.updated_at
            from categories c left join categories p on p.id = c.parent_id
           where c.active and (p.id is null or p.active) and ${notNoindex('c')}`),
    many(`select slug, updated_at from trends t where ${IS_CURRENT} and ${notNoindex('t')}`),
    many(`select slug, updated_at from seasonal_pages s where active and ${notNoindex('s')}`),
    many(`select slug, updated_at from collections c where active and ${notNoindex('c')}`),
    many(`select slug, updated_at from products where active`),
    many(`select slug, updated_at from pages p where active and ${notNoindex('p')}`),
  ]);

  const urls = [
    { loc: '/', priority: '1.0', changefreq: 'daily' },
    { loc: '/guides', priority: '0.9', changefreq: 'daily' },
    { loc: '/trending', priority: '0.8', changefreq: 'daily' },
    { loc: '/seasonal', priority: '0.6', changefreq: 'weekly' },
    ...guides.map((g) => ({ loc: `/guides/${g.slug}`, lastmod: g.updated_at, priority: '0.9' })),
    ...categories.map((c) => ({ loc: c.path, lastmod: c.updated_at, priority: '0.7' })),
    ...trends.map((t) => ({ loc: `/trending/${t.slug}`, lastmod: t.updated_at, priority: '0.6' })),
    ...seasonal.map((s) => ({ loc: `/seasonal/${s.slug}`, lastmod: s.updated_at, priority: '0.7' })),
    ...collections.map((c) => ({ loc: `/collections/${c.slug}`, lastmod: c.updated_at, priority: '0.6' })),
    ...products.map((p) => ({ loc: `/products/${p.slug}`, lastmod: p.updated_at, priority: '0.5' })),
    ...pages.filter((p) => STATIC_PAGES.includes(p.slug)).map((p) => ({ loc: `/${p.slug}`, lastmod: p.updated_at, priority: '0.3' })),
  ];

  const body = urls
    .map((u) =>
      [
        '  <url>',
        `    <loc>${esc(base + u.loc)}</loc>`,
        u.lastmod ? `    <lastmod>${new Date(u.lastmod).toISOString()}</lastmod>` : '',
        u.changefreq ? `    <changefreq>${u.changefreq}</changefreq>` : '',
        u.priority ? `    <priority>${u.priority}</priority>` : '',
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n'),
    )
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function buildRobots() {
  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /search',
    '',
    `Sitemap: ${env.clientUrl}/sitemap.xml`,
    '',
  ].join('\n');
}

/** Look up the content behind a public path and return its share metadata. */
async function metaForPath(path, { pinterestBot }) {
  const parts = path.split('/').filter(Boolean);
  const pin = async (type, id) =>
    one('select title, description, image_url from pinterest_metadata where entity_type = $1 and entity_id = $2', [type, id]);

  const pick = async (row, type, fallbackTitle, fallbackDesc, fallbackImage, extra = {}) => {
    if (!row) return null;
    const seo = row.seo || {};
    const p = pinterestBot ? await pin(type, row.id) : null;
    return {
      title: p?.title || seo.og_title || seo.title || fallbackTitle,
      description: p?.description || seo.og_description || seo.description || fallbackDesc,
      image: p?.image_url || seo.og_image || fallbackImage,
      canonical: seo.canonical || `${env.clientUrl}${path}`,
      twitterTitle: seo.twitter_title,
      twitterDescription: seo.twitter_description,
      twitterImage: seo.twitter_image,
      ...extra,
    };
  };

  if (parts[0] === 'guides' && parts[1]) {
    const g = await one(`select g.*, u.display_name as author from guides g left join users u on u.id = g.author_id
                          where g.slug = $1 and ${IS_LIVE}`, [parts[1]]);
    return pick(g, 'guide', g?.title, g?.excerpt || g?.subtitle, g?.hero_image, g && {
      type: 'article',
      published: g.published_at,
      modified: g.updated_at,
      author: g.author,
      body: g.quick_answer || g.excerpt,
    });
  }
  if (parts[0] === 'trending' && parts[1]) {
    const t = await one(`select * from trends t where slug = $1 and ${IS_CURRENT}`, [parts[1]]);
    return pick(t, 'trend', t?.title, t?.description, t?.image_url);
  }
  if (parts[0] === 'seasonal' && parts[1]) {
    const s = await one('select * from seasonal_pages where slug = $1 and active', [parts[1]]);
    return pick(s, 'seasonal_page', s?.hero_title || s?.title, s?.hero_subtitle, s?.hero_image);
  }
  if (parts[0] === 'collections' && parts[1]) {
    const c = await one('select * from collections where slug = $1 and active', [parts[1]]);
    return pick(c, 'collection', c?.title, c?.description, c?.image_url);
  }
  if (parts[0] === 'products' && parts[1]) {
    const p = await one(`select p.*, (select url from product_images i where i.product_id = p.id order by sort_order limit 1) as image
                           from products p where slug = $1 and active`, [parts[1]]);
    return pick(p ? { ...p, seo: {} } : null, 'product', p?.name, p?.short_description, p?.image);
  }
  if (parts.length === 1 && STATIC_PAGES.includes(parts[0])) {
    const pg = await one('select * from pages where slug = $1 and active', [parts[0]]);
    return pick(pg, 'page', pg?.title, pg?.summary, null);
  }
  if (parts.length === 1 || parts.length === 2) {
    const c = parts.length === 2
      ? await one(`select c.* from categories c join categories p on p.id = c.parent_id
                    where c.slug = $1 and p.slug = $2 and c.active`, [parts[1], parts[0]])
      : await one('select * from categories where slug = $1 and parent_id is null and active', [parts[0]]);
    return pick(c, 'category', c?.name, c?.description, c?.image_url);
  }
  return null;
}

export async function renderSharePage(path, userAgent = '') {
  const settings = await getSettings();
  const pinterestBot = /pinterest/i.test(userAgent);
  const cleanPath = `/${String(path || '').replace(/^\/+/, '').replace(/[?#].*$/, '')}`;
  const found = cleanPath === '/' ? null : await metaForPath(cleanPath, { pinterestBot });
  const suffix = settings.seo.title_suffix || '';

  const m = found || {
    title: `${settings.site.name} — ${settings.site.tagline}`,
    description: settings.site.description,
    image: settings.seo.default_og_image,
    canonical: `${env.clientUrl}${cleanPath}`,
  };
  const image = sizedImage(stillImage(m.image, env.clientUrl) || settings.seo.default_og_image || '', 1200);
  const fullTitle = found ? `${m.title}${suffix}` : m.title;
  const status = found || cleanPath === '/' ? 200 : 404;

  const tags = [
    `<title>${esc(fullTitle)}</title>`,
    `<meta name="description" content="${esc(m.description || '')}">`,
    `<link rel="canonical" href="${esc(m.canonical)}">`,
    `<meta property="og:site_name" content="${esc(settings.site.name)}">`,
    `<meta property="og:type" content="${m.type || 'website'}">`,
    `<meta property="og:title" content="${esc(m.title)}">`,
    `<meta property="og:description" content="${esc(m.description || '')}">`,
    `<meta property="og:url" content="${esc(m.canonical)}">`,
    image && `<meta property="og:image" content="${esc(image)}">`,
    m.published && `<meta property="article:published_time" content="${new Date(m.published).toISOString()}">`,
    m.modified && `<meta property="article:modified_time" content="${new Date(m.modified).toISOString()}">`,
    m.author && `<meta name="author" content="${esc(m.author)}">`,
    `<meta name="twitter:card" content="${image ? 'summary_large_image' : 'summary'}">`,
    `<meta name="twitter:title" content="${esc(m.twitterTitle || m.title)}">`,
    `<meta name="twitter:description" content="${esc(m.twitterDescription || m.description || '')}">`,
    (m.twitterImage || image) && `<meta name="twitter:image" content="${esc(sizedImage(m.twitterImage, 1200) || image)}">`,
    settings.seo.twitter_handle && `<meta name="twitter:site" content="${esc(settings.seo.twitter_handle)}">`,
    settings.seo.pinterest_domain_verify && `<meta name="p:domain_verify" content="${esc(settings.seo.pinterest_domain_verify)}">`,
  ].filter(Boolean);

  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
${tags.join('\n')}
</head><body>
<main><h1>${esc(m.title)}</h1><p>${esc(m.body || m.description || '')}</p>
<p><a href="${esc(m.canonical)}">Read on ${esc(settings.site.name)}</a></p></main>
</body></html>`;
  return { status, html };
}
