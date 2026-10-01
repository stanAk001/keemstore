import { createContext, useContext } from 'react';
import { useFetch } from '../lib/useFetch.js';

const SiteContext = createContext(null);

// Fallback so the shell renders even if the settings request fails.
const FALLBACK = {
  site: { name: 'keemstore', tagline: 'Find things worth buying.', description: '' },
  announcement: { enabled: false },
  seo: {},
  affiliate: { cta_primary: 'See it on Amazon', cta_secondary: 'Check current price', disclosure_short: '' },
  social: {},
  newsletter: { enabled: false },
  footer: {},
  navigation: {},
  categories: [],
};

export function SiteProvider({ children }) {
  const { data, error } = useFetch('/settings');
  const value = data || (error ? FALLBACK : null);
  return <SiteContext.Provider value={value ? { ...value, ready: Boolean(data) } : { ...FALLBACK, ready: false }}>{children}</SiteContext.Provider>;
}

export const useSite = () => useContext(SiteContext);
