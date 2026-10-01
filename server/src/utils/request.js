export function detectDevice(userAgent = '') {
  const ua = userAgent.toLowerCase();
  if (!ua) return 'unknown';
  if (/bot|crawler|spider|preview|facebookexternalhit|pinterest/.test(ua)) return 'bot';
  if (/ipad|tablet|(android(?!.*mobile))/.test(ua)) return 'tablet';
  if (/mobi|iphone|android/.test(ua)) return 'mobile';
  return 'desktop';
}

/** Reduce a referrer to a coarse traffic source label. */
export function detectSource(referrer = '', utmSource = '') {
  if (utmSource) return String(utmSource).toLowerCase().slice(0, 40);
  if (!referrer) return 'direct';
  let host = '';
  try {
    host = new URL(referrer).hostname.replace(/^www\./, '');
  } catch {
    return 'unknown';
  }
  if (/pinterest\./.test(host) || host === 'pin.it') return 'pinterest';
  if (/google\./.test(host)) return 'google';
  if (/bing\.com|duckduckgo\.com|yahoo\./.test(host)) return 'search-other';
  if (/facebook\.com|instagram\.com|t\.co|twitter\.com|x\.com|tiktok\.com|reddit\.com/.test(host)) return 'social';
  return host.slice(0, 60);
}

export function truncate(value, max = 500) {
  if (value == null) return null;
  const s = String(value);
  return s.length > max ? s.slice(0, max) : s;
}
