import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { trackEvent } from './track.js';

/**
 * Record one page view per path once `ready` is true.
 * entity_type/entity_id attribute the view to a guide, category, etc.
 */
export function usePageView({ entityType, entityId, ready = true } = {}) {
  const { pathname } = useLocation();
  const sent = useRef(null);
  useEffect(() => {
    if (!ready || sent.current === pathname) return;
    sent.current = pathname;
    trackEvent('page_view', { entity_type: entityType, entity_id: entityId });
  }, [pathname, ready, entityType, entityId]);
}
