// Import products from a partner store (Shopify's public product feed, with an
// Open Graph fallback for other platforms).
//
// Security: the server only ever fetches from domains registered as active,
// non-Amazon affiliate programs — never arbitrary URLs — so this can't be used
// to probe internal networks.
import { many, transaction } from '../config/db.js';
import { getPrograms, unwrapNetworkLink } from './affiliate.service.js';
import { HttpError } from '../utils/httpError.js';
import { slugify } from '../utils/slug.js';

const MAX_BYTES = 6 * 1024 * 1024;
const TIMEOUT_MS = 15_000;

const bare = (h) => String(h || '').toLowerCase().replace(/^www\./, '');
// Prices are deliberately not imported: stores convert them to the visitor's
// local currency (e.g. naira for a server in Nigeria), so the number fetched
// here is not what your readers would see.

/** The affiliate program whose domain matches `url`, or a 400 error. */
async function programForUrl(rawUrl) {
  let url;
  try {
    // A network link (e.g. Rakuten) is read via the store page it points to.
    url = new URL(unwrapNetworkLink(rawUrl) || rawUrl);
  } catch {
    throw new HttpError(400, 'That is not a valid link');
  }
  if (url.protocol !== 'https:') throw new HttpError(400, 'Only https:// links can be imported');
  const host = bare(url.hostname);
  const programs = [...(await getPrograms()).values()];
  const program = programs.find((p) => p.active && p.slug !== 'amazon' && p.base_domain && (host === bare(p.base_domain) || host.endsWith(`.${bare(p.base_domain)}`)));
  if (!program) throw new HttpError(400, `No active affiliate program is set up for ${host}. Add it in Affiliate settings first.`);
  return { program, url };
}

export async function programById(id) {
  const program = (await getPrograms()).get(Number(id));
  if (!program || !program.active || program.slug === 'amazon' || !program.base_domain) {
    throw new HttpError(400, 'Choose an active partner store with a domain set in Affiliate settings');
  }
  return program;
}

/** Fetch with a timeout, a size cap, and a check that redirects stay on the store's domain. */
async function fetchFromStore(url, program, accept = 'application/json') {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetch(url, { signal: ctrl.signal, headers: { accept, 'user-agent': 'Mozilla/5.0 (compatible; StoreImport/1.0)' }, redirect: 'follow' });
  } catch (err) {
    throw new HttpError(502, err.name === 'AbortError' ? 'The store took too long to respond' : 'Could not reach the store');
  } finally {
    clearTimeout(timer);
  }
  const finalHost = bare(new URL(res.url).hostname);
  const domain = bare(program.base_domain);
  if (finalHost !== domain && !finalHost.endsWith(`.${domain}`)) throw new HttpError(502, 'The store redirected somewhere unexpected');
  if (!res.ok) throw new HttpError(res.status === 404 ? 404 : 502, res.status === 404 ? 'That product was not found on the store' : `The store returned an error (${res.status})`);
  const len = Number(res.headers.get('content-length') || 0);
  if (len > MAX_BYTES) throw new HttpError(502, 'The store response was too large');
  const text = await res.text();
  if (text.length > MAX_BYTES) throw new HttpError(502, 'The store response was too large');
  return { text, finalUrl: res.url };
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', ldquo: '“', rdquo: '”', ndash: '–', mdash: '—', hellip: '…', pound: '£' };
export function htmlToText(html = '') {
  return String(html)
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6])>|<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (m, e) => ENTITIES[e.toLowerCase()] ?? (e.startsWith('#') ? String.fromCharCode(Number(e.slice(1)) || 32) : m))
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function firstSentence(text, max = 200) {
  const oneLine = text.replace(/\n+/g, ' ').trim();
  const m = oneLine.match(/^.{20,}?[.!?](\s|$)/);
  const s = (m ? m[0] : oneLine).trim();
  return s.length > max ? `${s.slice(0, max - 1).replace(/\s+\S*$/, '')}…` : s;
}

/** Normalise a Shopify product (from products.json) into our draft shape. */
function fromShopify(p, program, origin) {
  const text = htmlToText(p.body_html).slice(0, 5000);
  return {
    handle: p.handle,
    name: p.title,
    brand: p.vendor || program.name,
    short_description: firstSentence(text) || null,
    description: text || null,
    product_type: p.product_type || null,
    available: Boolean(p.variants?.some((v) => v.available)),
    images: (p.images || []).slice(0, 6).map((im) => ({ url: im.src, alt: im.alt || p.title })),
    affiliate_url: `${origin}/products/${p.handle}`,
    tags: [slugify(p.product_type || '')].filter(Boolean),
  };
}

const shopifyHandle = (url) => url.pathname.match(/\/products\/([^/?#]+)/)?.[1] || null;

/** Build a draft product from a single store product link. */
export async function draftFromLink(rawUrl) {
  const { program, url } = await programForUrl(rawUrl);
  const origin = `https://${url.hostname}`;
  const handle = shopifyHandle(url);
  if (handle) {
    try {
      const { text } = await fetchFromStore(`${origin}/products/${handle}.json`, program);
      const { product } = JSON.parse(text);
      if (product) return { program_id: program.id, retailer: program.name, ...fromShopify(product, program, origin) };
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) throw err;
      /* not Shopify — fall back to Open Graph tags below */
    }
  }
  const { text: html } = await fetchFromStore(url.toString(), program, 'text/html');
  const meta = (prop) => html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']*)["']`, 'i'))?.[1]
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${prop}["']`, 'i'))?.[1];
  const name = htmlToText(meta('og:title') || html.match(/<title>([^<]*)<\/title>/i)?.[1] || '');
  if (!name) throw new HttpError(422, 'Could not read product details from that page');
  const desc = htmlToText(meta('og:description') || meta('description') || '');
  const image = meta('og:image');
  return {
    program_id: program.id,
    retailer: program.name,
    name,
    brand: program.name,
    short_description: firstSentence(desc) || null,
    description: desc || null,
    images: image ? [{ url: image.startsWith('//') ? `https:${image}` : image, alt: name }] : [],
    affiliate_url: url.toString().split('#')[0],
    tags: [],
  };
}

/** One page of a partner store's catalogue, marking products already imported. */
export async function browseFeed(programId, { page = 1, q = '' } = {}) {
  const program = await programById(programId);
  const origin = `https://${program.base_domain.replace(/^https?:\/\//, '')}`;
  const { text, finalUrl } = await fetchFromStore(`${origin}/products.json?limit=250&page=${Math.max(1, Number(page) || 1)}`, program);
  let products;
  try {
    ({ products } = JSON.parse(text));
  } catch {
    throw new HttpError(422, 'This store does not offer a product feed. Add products one at a time with “Fill from link”.');
  }
  const realOrigin = new URL(finalUrl).origin;
  const term = String(q).toLowerCase().trim();
  const items = (products || [])
    .map((p) => fromShopify(p, program, realOrigin))
    .filter((p) => !term || `${p.name} ${p.product_type}`.toLowerCase().includes(term));
  const imported = await importedHandles(program);
  return {
    program: { id: program.id, name: program.name },
    page: Number(page) || 1,
    hasMore: (products || []).length === 250,
    items: items.map(({ description, ...rest }) => ({ ...rest, imported: imported.has(String(rest.handle).toLowerCase()) })),
  };
}

/**
 * Handles of this store's products already in the catalogue. Matched on the
 * /products/<handle> path, so www/non-www, tracking query strings and links
 * pasted already wrapped by a network (Rakuten) don't cause duplicates.
 */
async function importedHandles(program, client = { query: (t, p) => many(t, p).then((rows) => ({ rows })) }) {
  const domain = bare(program.base_domain.replace(/^https?:\/\//, ''));
  const { rows } = await client.query('select affiliate_url from products where affiliate_url ilike $1', [`%${domain}%`]);
  const handles = new Set();
  for (const { affiliate_url: link } of rows) {
    try {
      const url = new URL(unwrapNetworkLink(link) || link);
      if (bare(url.hostname) !== domain) continue;
      const handle = shopifyHandle(url);
      if (handle) handles.add(handle.toLowerCase());
    } catch {
      /* ignore malformed links */
    }
  }
  return handles;
}

/** Create products for the given store handles. Existing links are skipped. */
export async function importProducts({ programId, handles, categoryId, subcategoryId, active, extraTags = [] }) {
  const program = await programById(programId);
  const origin = `https://${program.base_domain.replace(/^https?:\/\//, '')}`;
  const drafts = [];
  for (const handle of [...new Set(handles)].slice(0, 60)) {
    try {
      const { text, finalUrl } = await fetchFromStore(`${origin}/products/${encodeURIComponent(handle)}.json`, program);
      const { product } = JSON.parse(text);
      if (product) drafts.push(fromShopify(product, program, new URL(finalUrl).origin));
    } catch {
      /* skip products that fail to load; reported as not imported */
    }
  }

  let added = 0;
  let skipped = 0;
  await transaction(async (client) => {
    const existing = await importedHandles(program, client);
    for (const d of drafts) {
      if (existing.has(d.handle.toLowerCase())) {
        skipped++;
        continue;
      }
      existing.add(d.handle.toLowerCase());
      let slug = slugify(d.name) || slugify(d.handle);
      for (let n = 2; (await client.query('select 1 from products where slug = $1', [slug])).rowCount; n++) slug = `${slugify(d.name)}-${n}`;
      const { rows } = await client.query(
        `insert into products (name, slug, brand, short_description, description, category_id, subcategory_id, affiliate_url,
                               tags, active, is_demo)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false) returning id`,
        [d.name, slug, d.brand, d.short_description, d.description, categoryId ?? null, subcategoryId ?? null, d.affiliate_url,
          [...new Set([...d.tags, ...extraTags])], Boolean(active)],
      );
      for (const [i, im] of d.images.entries()) {
        await client.query('insert into product_images (product_id, url, alt, sort_order) values ($1, $2, $3, $4)', [rows[0].id, im.url, im.alt, i]);
      }
      added++;
    }
  });
  return { added, skipped, failed: handles.length - drafts.length };
}

