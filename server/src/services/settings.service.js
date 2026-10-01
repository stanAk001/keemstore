import { many, query } from '../config/db.js';

// Defaults double as the schema of editable settings. Anything missing in the
// database falls back to these, so a fresh install always renders.
export const SETTINGS_DEFAULTS = {
  site: {
    name: 'keemstore',
    tagline: 'Things worth keeping.',
    description:
      'keemstore is a curated store of things worth keeping — smart gadgets, useful finds and fashion, each with honest notes on who it’s for and who should skip it.',
    contact_email: 'keemstore.com@gmail.com',
    logo_url: '',
  },
  announcement: {
    enabled: true,
    label: "What's trending",
    text: 'Halloween finds',
    url: '/seasonal/halloween',
  },
  seo: {
    title_suffix: ' — keemstore',
    default_description: 'Useful gadgets, home upgrades and fashion finds, curated with context: who it is for, who should skip it.',
    default_og_image: '',
    twitter_handle: '',
    pinterest_domain_verify: '',
    google_site_verification: '',
  },
  affiliate: {
    disclosure_short:
      'We may earn a commission when you buy through links on this page. It never changes the price you pay or what we recommend.',
    append_amazon_tag: true,
    // Amazon's Associates policies only allow showing prices and star ratings
    // that come from the Product Advertising API and are kept current. Prices
    // typed in by hand go stale, so both stay hidden unless switched on.
    show_prices: false,
    show_ratings: false,
    cta_primary: 'See it on Amazon',
    cta_secondary: 'Check current price',
  },
  social: { pinterest: '', instagram: '', tiktok: '', x: '', youtube: '', facebook: '' },
  newsletter: {
    enabled: true,
    headline: 'Good finds. No endless scrolling.',
    subtext: 'One short email when we publish something worth your time. Unsubscribe whenever.',
    button_label: 'Subscribe',
    success_message: "You're on the list. We'll only write when it's worth it.",
  },
  footer: {
    blurb: 'An independent shopping publication — a store of finds worth keeping. We say who each one is for, and say plainly when something isn’t worth it.',
    // Designer credit shown at the very bottom of every page (blank = hidden).
    credit_label: 'Designed & built by',
    credit_name: '',
    credit_url: '',
  },
};

export const SETTING_KEYS = Object.keys(SETTINGS_DEFAULTS);

let cache = null;
let cacheAt = 0;
const TTL = 30_000;

export async function getSettings({ fresh = false } = {}) {
  if (!fresh && cache && Date.now() - cacheAt < TTL) return cache;
  const rows = await many('select key, value from site_settings');
  const stored = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  const merged = {};
  for (const key of SETTING_KEYS) merged[key] = { ...SETTINGS_DEFAULTS[key], ...(stored[key] || {}) };
  cache = merged;
  cacheAt = Date.now();
  return merged;
}

export async function updateSettings(patch) {
  for (const [key, value] of Object.entries(patch)) {
    if (!SETTING_KEYS.includes(key) || typeof value !== 'object' || value === null) continue;
    // Only keep known fields for each group.
    const allowed = Object.keys(SETTINGS_DEFAULTS[key]);
    const clean = Object.fromEntries(Object.entries(value).filter(([k]) => allowed.includes(k)));
    await query(
      `insert into site_settings (key, value) values ($1, $2)
       on conflict (key) do update set value = site_settings.value || excluded.value`,
      [key, JSON.stringify(clean)],
    );
  }
  cache = null;
  return getSettings({ fresh: true });
}

export function invalidateSettings() {
  cache = null;
}
