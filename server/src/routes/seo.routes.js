import { Router } from 'express';
import { buildSitemap, buildRobots, renderSharePage } from '../services/seo.service.js';

const r = Router();

r.get('/sitemap.xml', async (_req, res) => {
  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=900');
  res.send(await buildSitemap());
});

r.get('/robots.txt', (_req, res) => {
  res.type('text/plain').set('Cache-Control', 'public, max-age=3600').send(buildRobots());
});

// Crawler share pages: /share, /share/guides/some-guide, ...
r.get(['/share', '/share/*path'], async (req, res) => {
  const path = Array.isArray(req.params.path) ? req.params.path.join('/') : req.params.path || '';
  const { status, html } = await renderSharePage(path, req.get('user-agent'));
  res.status(status).set('Cache-Control', 'public, max-age=600').type('html').send(html);
});

export default r;
