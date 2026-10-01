// The one place that turns stored product/link data into the outbound URL a
// visitor clicks. Components never build affiliate URLs themselves.
import { many } from '../config/db.js';
import { env } from '../config/env.js';
import { getSettings } from './settings.service.js';

let programsCache = null;
let programsAt = 0;

export async function getPrograms() {
  if (programsCache && Date.now() - programsAt < 60_000) return programsCache;
  const rows = await many('select * from affiliate_programs order by id');
  programsCache = new Map(rows.map((p) => [p.id, p]));
  programsAt = Date.now();
  return programsCache;
}

export function invalidatePrograms() {
  programsCache = null;
}

function trackingIdFor(program) {
  if (!program) return '';
  if (program.tracking_id) return program.tracking_id;
  return program.slug === 'amazon' ? env.amazonAssociateTag : '';
}

// Affiliate network redirects and the query parameter holding the store URL.
const NETWORK_REDIRECTS = { 'click.linksynergy.com': 'murl', 'www.awin1.com': 'ued' };

/**
 * The store URL inside a network redirect link (e.g. a Rakuten link's `murl`),
 * or null if `rawUrl` isn't one. Already-wrapped links are used as-is on click;
 * this is only for recognising which store they point to.
 */
export function unwrapNetworkLink(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const param = NETWORK_REDIRECTS[url.hostname.toLowerCase()];
    const inner = param && url.searchParams.get(param);
    return inner && /^https?:\/\//i.test(inner) ? new URL(inner).toString() : null;
  } catch {
    return null;
  }
}

/**
 * Add the program's tracking to a URL on its domain: either wrap it in the
 * program's link template (Rakuten-style redirect) or add its tracking
 * parameter (Amazon-style tag). Links on other domains — including links
 * already wrapped by a network — are returned unchanged.
 */
export function applyTracking(rawUrl, program) {
  if (!rawUrl) return null;
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (!program) return url.toString();
  const host = url.hostname.replace(/^www\./, '');
  const domain = (program.base_domain || '').replace(/^https?:\/\//, '').replace(/^www\./, '');
  const onDomain = !domain || host === domain || host.endsWith(`.${domain}`);
  if (program.link_template?.includes('{url}')) {
    return domain && onDomain ? program.link_template.replace('{url}', encodeURIComponent(url.toString())) : url.toString();
  }
  const tag = trackingIdFor(program);
  if (!program.tracking_param || !tag || !onDomain) return url.toString();
  if (!url.searchParams.has(program.tracking_param)) url.searchParams.set(program.tracking_param, tag);
  return url.toString();
}

/** The active, non-Amazon program whose domain matches `rawUrl` (or the store URL inside a network link). */
function programForUrl(rawUrl, programs) {
  let host;
  try {
    host = new URL(unwrapNetworkLink(rawUrl) || rawUrl).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
  for (const p of programs.values()) {
    const domain = (p.base_domain || '').replace(/^https?:\/\//, '').replace(/^www\./, '');
    if (p.active && p.slug !== 'amazon' && domain && (host === domain || host.endsWith(`.${domain}`))) return p;
  }
  return null;
}

function isAmazonUrl(u) {
  try {
    return /(^|\.)amazon\.[a-z.]+$/.test(new URL(u).hostname) || /(^|\.)amzn\.to$/.test(new URL(u).hostname);
  } catch {
    return false;
  }
}

/**
 * Resolve { url, link_id, program_id, program_name, retailer } for a product.
 * Priority: primary affiliate link → any active link → product.affiliate_url →
 * product.amazon_url (+tag) → ASIN-built Amazon URL (+tag).
 */
export function resolveOutbound(product, programs, settings) {
  const links = (product.affiliate_links || []).filter((l) => l.active !== false);
  const link = links.find((l) => l.is_primary) || links[0];
  const amazon = [...programs.values()].find((p) => p.slug === 'amazon');
  const tagAmazon = settings?.affiliate?.append_amazon_tag !== false;

  if (link) {
    const program = programs.get(link.program_id);
    return {
      url: applyTracking(link.url, program),
      link_id: link.id ?? null,
      program_id: program?.id ?? null,
      retailer: program?.name || 'retailer',
    };
  }
  if (product.affiliate_url) {
    const amz = isAmazonUrl(product.affiliate_url);
    if (amz) {
      return {
        url: tagAmazon ? applyTracking(product.affiliate_url, amazon) : product.affiliate_url,
        link_id: null,
        program_id: amazon?.id ?? null,
        retailer: 'Amazon',
      };
    }
    // A partner store link (e.g. Popsy Clothing): credit its program and add
    // that program's tracking parameter if one is configured.
    const partner = programForUrl(product.affiliate_url, programs);
    return {
      url: partner ? applyTracking(product.affiliate_url, partner) : product.affiliate_url,
      link_id: null,
      program_id: partner?.id ?? null,
      retailer: partner?.name || 'retailer',
    };
  }
  const amazonUrl = product.amazon_url || (product.asin ? `https://www.amazon.com/dp/${product.asin}` : null);
  if (amazonUrl) {
    return {
      url: tagAmazon ? applyTracking(amazonUrl, amazon) : amazonUrl,
      link_id: null,
      program_id: amazon?.id ?? null,
      retailer: 'Amazon',
    };
  }
  return { url: null, link_id: null, program_id: null, retailer: null };
}

export async function withOutbound(products) {
  const [programs, settings] = await Promise.all([getPrograms(), getSettings()]);
  return products.map((p) => ({ ...p, outbound: resolveOutbound(p, programs, settings) }));
}
