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

// Top-level URL segments owned by the app; a top-level category can't use them.
export const RESERVED_SLUGS = new Set([
  'admin', 'api', 'guides', 'trending', 'seasonal', 'search', 'collections', 'products',
  'login', 'register', 'about', 'contact', 'privacy', 'terms', 'affiliate-disclosure',
  'editorial-policy', 'pages', 'sitemap.xml', 'robots.txt', 'share', 'account', 'shop',
]);
