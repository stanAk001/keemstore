import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { publicCache, noStore } from '../middleware/cache.js';
import { authLimiter, trackingLimiter, newsletterLimiter } from '../middleware/rateLimit.js';
import * as S from '../validators/schemas.js';
import * as auth from '../controllers/auth.controller.js';
import * as products from '../controllers/products.controller.js';
import * as categories from '../controllers/categories.controller.js';
import * as guides from '../controllers/guides.controller.js';
import * as content from '../controllers/content.controller.js';
import * as settings from '../controllers/settings.controller.js';
import * as marketing from '../controllers/marketing.controller.js';

const r = Router();

// Auth
r.post('/auth/register', authLimiter, validate(S.registerSchema), auth.register);
r.post('/auth/login', authLimiter, validate(S.loginSchema), auth.login);
r.get('/auth/me', noStore, requireAuth, auth.me);
r.put('/auth/me', requireAuth, validate(S.profileSchema), auth.updateMe);

// Layout bootstrap (settings, navigation, category tree)
r.get('/settings', publicCache(60), settings.publicBootstrap);
r.get('/homepage', publicCache(60), content.homepagePublic);

// Catalog
r.get('/categories', publicCache(120), categories.tree);
r.get('/categories/by-path', publicCache(60), categories.byPath);
r.get('/products', publicCache(60), products.listPublic);
r.get('/products/:slug', publicCache(60), products.getPublic);

// Editorial
r.get('/guides', publicCache(60), guides.listPublic);
r.get('/guides/:slug', optionalAuth, publicCache(60), guides.getPublic);
r.get('/trends', publicCache(60), content.listTrendsPublic);
r.get('/trends/:slug', publicCache(60), content.getTrendPublic);
r.get('/seasonal', publicCache(120), content.listSeasonalPublic);
r.get('/seasonal/:slug', publicCache(60), content.getSeasonalPublic);
r.get('/collections', publicCache(120), content.listCollectionsPublic);
r.get('/collections/:slug', publicCache(60), content.getCollectionPublic);
r.get('/pages/:slug', publicCache(300), content.getPagePublic);

// Search
r.get('/search', noStore, marketing.search);
r.get('/search/suggest', publicCache(30), marketing.suggest);

// Tracking beacons & newsletter
r.post('/track/click', trackingLimiter, validate(S.trackClickSchema), marketing.trackClick);
r.post('/track/event', trackingLimiter, validate(S.trackEventSchema), marketing.trackEvent);
r.post('/newsletter', newsletterLimiter, validate(S.newsletterSchema), marketing.subscribe);

export default r;
