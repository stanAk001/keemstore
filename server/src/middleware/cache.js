/** Short public cache for anonymous GET responses (CDN + browser). */
export function publicCache(seconds = 60) {
  return (_req, res, next) => {
    res.set('Cache-Control', `public, max-age=${seconds}, stale-while-revalidate=${seconds * 5}`);
    next();
  };
}

export function noStore(_req, res, next) {
  res.set('Cache-Control', 'no-store');
  next();
}
