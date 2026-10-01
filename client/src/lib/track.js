// First-party analytics beacons. Never blocks navigation; failures are ignored.
import { API_URL } from './api.js';

function session() {
  try {
    let s = sessionStorage.getItem('keemstore.sid');
    if (!s) {
      s = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem('keemstore.sid', s);
      // Remember how this visit arrived (landing referrer + utm_source).
      sessionStorage.setItem('keemstore.ref', document.referrer || '');
      sessionStorage.setItem('keemstore.utm', new URLSearchParams(location.search).get('utm_source') || '');
    }
    return { id: s, referrer: sessionStorage.getItem('keemstore.ref') || null, utm: sessionStorage.getItem('keemstore.utm') || null };
  } catch {
    return { id: null, referrer: document.referrer || null, utm: null };
  }
}

function send(path, payload) {
  const body = JSON.stringify(payload);
  const url = `${API_URL}/api/track/${path}`;
  try {
    if (navigator.sendBeacon && navigator.sendBeacon(url, new Blob([body], { type: 'text/plain' }))) return;
  } catch {
    /* fall through */
  }
  fetch(url, { method: 'POST', body, headers: { 'Content-Type': 'text/plain' }, keepalive: true }).catch(() => {});
}

const clean = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== null && v !== ''));

export function trackEvent(event_type, { entity_type, entity_id, query } = {}) {
  const s = session();
  send('event', clean({
    event_type, entity_type, entity_id, query,
    path: location.pathname, referrer: s.referrer, utm_source: s.utm, session_id: s.id,
  }));
}

export function trackAffiliateClick(product, { guideId, categoryId, cta } = {}) {
  if (!product?.id) return;
  const s = session();
  send('click', clean({
    product_id: product.id,
    guide_id: guideId,
    category_id: categoryId,
    affiliate_link_id: product.outbound?.link_id,
    cta_location: cta,
    page_path: location.pathname,
    referrer: s.referrer,
    utm_source: s.utm,
    session_id: s.id,
  }));
}
