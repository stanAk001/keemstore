import { useEffect, useRef, useState, useCallback } from 'react';
import { api } from './api.js';

// Tiny stale-while-revalidate cache shared across the app.
const cache = new Map();
const TTL = 60_000;

export function prefetch(url) {
  if (cache.has(url) && Date.now() - cache.get(url).at < TTL) return;
  api.get(url).then((r) => cache.set(url, { data: r.data, at: Date.now() })).catch(() => {});
}

export function clearCache(prefix = '') {
  for (const key of cache.keys()) if (key.startsWith(prefix)) cache.delete(key);
}

/**
 * GET `url` (relative to /api). Returns { data, error, loading, reload }.
 * Pass null to skip. Cached data renders instantly, then refreshes if stale.
 */
export function useFetch(url, { cacheable = true } = {}) {
  const hit = url && cacheable ? cache.get(url) : null;
  const [state, setState] = useState({ data: hit?.data ?? null, error: null, loading: Boolean(url) && !hit });
  const current = useRef(url);

  const load = useCallback(
    async (target, { silent } = {}) => {
      if (!target) return;
      if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
      try {
        const res = await api.get(target);
        if (cacheable) cache.set(target, { data: res.data, at: Date.now() });
        if (current.current === target) setState({ data: res.data, error: null, loading: false });
      } catch (error) {
        if (current.current === target) setState((s) => ({ data: silent ? s.data : null, error, loading: false }));
      }
    },
    [cacheable],
  );

  useEffect(() => {
    current.current = url;
    if (!url) {
      setState({ data: null, error: null, loading: false });
      return;
    }
    const cached = cacheable ? cache.get(url) : null;
    if (cached) {
      setState({ data: cached.data, error: null, loading: false });
      if (Date.now() - cached.at > TTL) load(url, { silent: true });
    } else {
      load(url);
    }
  }, [url, cacheable, load]);

  return { ...state, reload: () => load(url) };
}
