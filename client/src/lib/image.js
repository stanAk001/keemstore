// Responsive image URLs for the CDNs we use. Unknown hosts are returned as-is.
const WIDTHS = [320, 480, 640, 800, 1080, 1400, 1800];

export function sized(url, width, { height, quality = 75 } = {}) {
  if (!url) return url;
  try {
    const u = new URL(url);
    if (u.hostname === 'images.unsplash.com') {
      u.searchParams.set('w', String(width));
      if (height) u.searchParams.set('h', String(height));
      u.searchParams.set('q', String(quality));
      u.searchParams.set('auto', 'format');
      u.searchParams.set('fit', 'crop');
      return u.toString();
    }
    if (u.hostname === 'images.pexels.com') {
      u.search = '';
      u.searchParams.set('auto', 'compress');
      u.searchParams.set('cs', 'tinysrgb');
      u.searchParams.set('w', String(width));
      if (height) {
        u.searchParams.set('h', String(height));
        u.searchParams.set('fit', 'crop');
      }
      return u.toString();
    }
    // Shopify stores (partner retailers): resize by width only. No server-side
    // crop — Img anchors tall fashion photos to the top so heads aren't cut off.
    if (u.hostname === 'cdn.shopify.com') {
      u.searchParams.set('width', String(width));
      return u.toString();
    }
    if (u.hostname === 'res.cloudinary.com' && u.pathname.includes('/image/upload/')) {
      const t = [`w_${width}`, height && `h_${height}`, height ? 'c_fill' : 'c_limit', 'q_auto', 'f_auto'].filter(Boolean).join(',');
      return url.replace('/image/upload/', `/image/upload/${t}/`);
    }
  } catch {
    /* relative or malformed URL */
  }
  return url;
}

export function srcSet(url, maxWidth = 1800, aspect) {
  if (!url) return undefined;
  const host = (() => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  })();
  if (!['images.unsplash.com', 'images.pexels.com', 'res.cloudinary.com', 'cdn.shopify.com'].includes(host)) return undefined;
  return WIDTHS.filter((w) => w <= maxWidth)
    .map((w) => `${sized(url, w, aspect ? { height: Math.round(w / aspect) } : {})} ${w}w`)
    .join(', ');
}
