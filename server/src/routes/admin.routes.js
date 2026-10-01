import { Router } from 'express';
import multer from 'multer';
import { requireAuth, requireStaff, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { noStore } from '../middleware/cache.js';
import * as S from '../validators/schemas.js';
import { MAX_BYTES, ALLOWED_MIME } from '../services/media.service.js';
import * as products from '../controllers/products.controller.js';
import * as categories from '../controllers/categories.controller.js';
import * as guides from '../controllers/guides.controller.js';
import * as content from '../controllers/content.controller.js';
import * as settings from '../controllers/settings.controller.js';
import * as users from '../controllers/users.controller.js';
import * as media from '../controllers/media.controller.js';
import * as marketing from '../controllers/marketing.controller.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => cb(null, ALLOWED_MIME.includes(file.mimetype)),
});

// Partial updates reuse the create schema with every field optional.
const partial = (schema) => validate(schema.partial());

const r = Router();
r.use(noStore, requireAuth, requireStaff);

r.get('/dashboard', marketing.dashboard);
r.get('/lookups', marketing.lookups);

// Products
r.get('/products', products.listAdmin);
r.post('/products/import/preview', products.importPreview);
r.get('/products/import/feed', products.importFeed);
r.post('/products/import', validate(S.storeImportSchema), products.importSelected);
r.post('/products/bulk-active', validate(S.bulkActiveSchema), products.bulkActive);
r.get('/products/:id', products.getAdmin);
r.post('/products', validate(S.productSchema), products.create);
r.put('/products/:id', partial(S.productSchema), products.update);
r.delete('/products/:id', products.remove);

// Categories
r.get('/categories', categories.listAdmin);
r.post('/categories/reorder', validate(S.reorderSchema), categories.reorder);
r.post('/categories', validate(S.categorySchema), categories.create);
r.put('/categories/:id', partial(S.categorySchema), categories.update);
r.delete('/categories/:id', categories.remove);

// Guides
r.get('/guides', guides.listAdmin);
r.get('/guides/:id', guides.getAdmin);
r.post('/guides', validate(S.guideSchema), guides.create);
r.put('/guides/:id', partial(S.guideSchema), guides.update);
r.post('/guides/:id/status', guides.setStatus);
r.post('/guides/:id/duplicate', guides.duplicate);
r.delete('/guides/:id', guides.remove);

// Trends
r.get('/trends', content.listTrendsAdmin);
r.get('/trends/:id', content.getTrendAdmin);
r.post('/trends/reorder', validate(S.reorderSchema), content.reorderTrends);
r.post('/trends', validate(S.trendSchema), content.createTrend);
r.put('/trends/:id', partial(S.trendSchema), content.updateTrend);
r.delete('/trends/:id', content.deleteTrend);

// Collections
r.get('/collections', content.listCollectionsAdmin);
r.get('/collections/:id', content.getCollectionAdmin);
r.post('/collections', validate(S.collectionSchema), content.createCollection);
r.put('/collections/:id', partial(S.collectionSchema), content.updateCollection);
r.delete('/collections/:id', content.deleteCollection);

// Seasonal pages
r.get('/seasonal', content.listSeasonalAdmin);
r.get('/seasonal/:id', content.getSeasonalAdmin);
r.post('/seasonal', validate(S.seasonalPageSchema), content.createSeasonal);
r.put('/seasonal/:id', partial(S.seasonalPageSchema), content.updateSeasonal);
r.delete('/seasonal/:id', content.deleteSeasonal);

// Static pages
r.get('/pages', content.listPagesAdmin);
r.get('/pages/:id', content.getPageAdmin);
r.post('/pages', validate(S.pageSchema), content.createPage);
r.put('/pages/:id', partial(S.pageSchema), content.updatePage);
r.delete('/pages/:id', content.deletePage);

// Homepage builder
r.get('/homepage', content.homepageAdmin);
r.put('/homepage', validate(S.homepageSchema), content.saveHomepage);

// Pinterest
r.get('/pinterest', marketing.pinterestList);
r.put('/pinterest', validate(S.pinterestSchema), marketing.pinterestSave);

// Media
r.get('/media', media.list);
r.post('/media/upload', upload.single('file'), media.upload);
r.post('/media/external', validate(S.mediaExternalSchema), media.addExternal);
r.get('/media/:id/usage', media.usage);
r.put('/media/:id', validate(S.mediaUpdateSchema), media.update);
r.delete('/media/:id', media.remove);

// Analytics
r.get('/analytics/clicks', marketing.clicks);
r.get('/analytics/recent', marketing.recentClicks);
r.get('/analytics/content', marketing.contentPerformance);

// Newsletter
r.get('/newsletter', marketing.listSubscribers);
r.get('/newsletter/export', marketing.exportSubscribers);
r.patch('/newsletter/:id', marketing.updateSubscriber);
r.delete('/newsletter/:id', requireAdmin, marketing.deleteSubscriber);

// Authors are visible to editors (guide byline picker).
r.get('/authors', users.authors);

// ---- admin-only ------------------------------------------------------------
r.get('/settings', requireAdmin, settings.getAll);
r.put('/settings', requireAdmin, settings.saveAll);
r.get('/navigation', requireAdmin, settings.getNavigation);
r.put('/navigation', requireAdmin, validate(S.navigationSchema), settings.saveNavigation);
r.get('/affiliate-programs', settings.listPrograms);
r.post('/affiliate-programs', requireAdmin, validate(S.affiliateProgramSchema), settings.createProgram);
r.put('/affiliate-programs/:id', requireAdmin, validate(S.affiliateProgramSchema), settings.updateProgram);
r.delete('/affiliate-programs/:id', requireAdmin, settings.deleteProgram);

r.get('/users', requireAdmin, users.list);
r.post('/users', requireAdmin, validate(S.userCreateSchema), users.create);
r.put('/users/:id', requireAdmin, validate(S.userUpdateSchema), users.update);
r.delete('/users/:id', requireAdmin, users.remove);

export default r;
