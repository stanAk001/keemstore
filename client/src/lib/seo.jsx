// Per-page SEO. React 19 hoists <title>, <meta> and <link> into <head>.
import { useSite } from '../context/SiteContext.jsx';
import { sized } from './image.js';
import { isVideo, posterFor } from './media.js';

// Social cards need a still image: use a video's poster frame instead.
const still = (url) => (isVideo(url) ? posterFor(url, 1200) : url);

export function Seo({ title, description, seo = {}, image, type = 'website', path, noindex, jsonLd, publishedAt, modifiedAt }) {
  const site = useSite();
  const siteUrl = site?.site?.url || window.location.origin;
  const suffix = site?.seo?.title_suffix ?? '';
  const baseTitle = seo.title || title;
  const fullTitle = baseTitle ? `${baseTitle}${suffix}` : `${site?.site?.name || 'keemstore'} — ${site?.site?.tagline || ''}`;
  const desc = seo.description || description || site?.seo?.default_description || '';
  const canonical = seo.canonical || `${siteUrl}${path ?? window.location.pathname}`;
  const ogImage = sized(still(seo.og_image || image) || site?.seo?.default_og_image, 1200);
  const twImage = sized(seo.twitter_image, 1200) || ogImage;
  const robots = noindex || seo.noindex ? 'noindex, follow' : 'index, follow, max-image-preview:large';

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />
      <meta property="og:site_name" content={site?.site?.name || 'keemstore'} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={seo.og_title || baseTitle || fullTitle} />
      <meta property="og:description" content={seo.og_description || desc} />
      <meta property="og:url" content={canonical} />
      {ogImage && <meta property="og:image" content={ogImage} />}
      {publishedAt && <meta property="article:published_time" content={new Date(publishedAt).toISOString()} />}
      {modifiedAt && <meta property="article:modified_time" content={new Date(modifiedAt).toISOString()} />}
      <meta name="twitter:card" content={twImage ? 'summary_large_image' : 'summary'} />
      <meta name="twitter:title" content={seo.twitter_title || seo.og_title || baseTitle || fullTitle} />
      <meta name="twitter:description" content={seo.twitter_description || seo.og_description || desc} />
      {twImage && <meta name="twitter:image" content={twImage} />}
      {site?.seo?.twitter_handle && <meta name="twitter:site" content={site.seo.twitter_handle} />}
      {site?.seo?.pinterest_domain_verify && <meta name="p:domain_verify" content={site.seo.pinterest_domain_verify} />}
      {site?.seo?.google_site_verification && <meta name="google-site-verification" content={site.seo.google_site_verification} />}
      {jsonLd && (
        <script type="application/ld+json">{JSON.stringify(Array.isArray(jsonLd) ? jsonLd : [jsonLd]).replace(/</g, '\\u003c')}</script>
      )}
    </>
  );
}

export function breadcrumbLd(items, siteUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.label,
      ...(it.to ? { item: `${siteUrl}${it.to}` } : {}),
    })),
  };
}

/** ItemList of products. Only facts we store — no invented ratings or offers. */
export function itemListLd(name, products, siteUrl) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    itemListElement: products.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${siteUrl}/products/${p.slug}`,
      name: p.name,
    })),
  };
}
