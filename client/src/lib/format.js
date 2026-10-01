export function formatDate(value, opts = { month: 'long', day: 'numeric', year: 'numeric' }) {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', opts);
}

export function shortDate(value) {
  return formatDate(value, { month: 'short', day: 'numeric' });
}

export function price(product) {
  if (!product) return null;
  if (product.price_display) return product.price_display;
  if (product.current_price != null) return `$${Number(product.current_price).toFixed(2).replace(/\.00$/, '')}`;
  return null;
}

export function pad(n) {
  return String(n).padStart(2, '0');
}

export const STATUS_LABEL = {
  trending: 'Trending',
  rising: 'Rising',
  approaching: 'Coming up',
  seasonal: 'Seasonal',
  evergreen: 'Always popular',
};

/** http(s) or site-relative URLs only. Anything else becomes null. */
export function safeHref(url) {
  if (!url || typeof url !== 'string') return null;
  const u = url.trim();
  if (/^https?:\/\//i.test(u) || /^\/(?!\/)/.test(u) || /^#[\w-]+$/.test(u) || /^mailto:/i.test(u)) return u;
  return null;
}

export const isExternal = (url) => /^https?:\/\//i.test(url || '');

export function slugify(input = '') {
  return String(input)
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}
