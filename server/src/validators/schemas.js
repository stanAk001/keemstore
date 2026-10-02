import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------
const trimmed = (max = 500) => z.string().trim().max(max);
const optText = (max = 500) => trimmed(max).nullable().optional().transform((v) => (v === '' ? null : v));
const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens');

// http(s) URL or a site-relative path. Blocks javascript:, data: etc.
export const safeUrl = z
  .string()
  .trim()
  .max(2048)
  .refine((v) => v === '' || /^https?:\/\//i.test(v) || /^\/(?!\/)/.test(v), 'Must be an http(s) URL or a path starting with /');
const optUrl = safeUrl.nullable().optional().transform((v) => (v === '' ? null : v));
const id = z.coerce.number().int().positive();
const optId = z
  .union([id, z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' ? null : v));
const dateTime = z
  .union([z.string().datetime({ offset: true }), z.string().regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2})?)?$/), z.literal(''), z.null()])
  .optional()
  .transform((v) => (v === '' ? null : v));
const stringList = z.array(trimmed(300)).max(30);
const idList = z.array(id).max(200);

export const seoSchema = z
  .object({
    title: optText(160),
    description: optText(320),
    canonical: optUrl,
    focus_keyword: optText(120),
    og_title: optText(160),
    og_description: optText(320),
    og_image: optUrl,
    twitter_title: optText(160),
    twitter_description: optText(320),
    twitter_image: optUrl,
    noindex: z.boolean().optional(),
  })
  .partial()
  .default({});

// ---------------------------------------------------------------------------
// Content blocks (structured editor, no raw HTML)
// ---------------------------------------------------------------------------
export const BLOCK_TYPES = [
  'heading', 'paragraph', 'list', 'image', 'quote', 'table', 'product', 'comparison',
  'proscons', 'verdict', 'faq', 'callout', 'editor_note', 'cta', 'divider',
];

const block = z
  .object({ id: z.string().max(40).optional(), type: z.enum(BLOCK_TYPES) })
  .passthrough()
  .superRefine((b, ctx) => {
    // Any URL-bearing field inside a block must be safe.
    for (const key of ['url', 'href']) {
      if (b[key] != null && !safeUrl.safeParse(b[key]).success) {
        ctx.addIssue({ code: 'custom', message: `Unsafe ${key} in ${b.type} block`, path: [key] });
      }
    }
  });
export const blocksSchema = z.array(block).max(400).default([]);

const faqList = z.array(z.object({ q: trimmed(300), a: trimmed(3000) })).max(40);

// ---------------------------------------------------------------------------
// Auth & users
// ---------------------------------------------------------------------------
const password = z.string().min(10, 'Use at least 10 characters').max(200);

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password,
  display_name: trimmed(80).min(1),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1).max(200),
});

export const userCreateSchema = registerSchema.extend({
  role: z.enum(['admin', 'editor', 'user']).default('editor'),
  bio: optText(1000),
});

export const userUpdateSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  password: password.optional().or(z.literal('').transform(() => undefined)),
  display_name: trimmed(80).min(1).optional(),
  role: z.enum(['admin', 'editor', 'user']).optional(),
  bio: optText(1000),
  avatar_url: optUrl,
  active: z.boolean().optional(),
});

export const profileSchema = userUpdateSchema.pick({ display_name: true, bio: true, avatar_url: true, password: true });

// ---------------------------------------------------------------------------
// Catalog
// ---------------------------------------------------------------------------
export const categorySchema = z.object({
  name: trimmed(80).min(1),
  slug: slug.optional(),
  parent_id: optId,
  description: optText(500),
  intro: optText(3000),
  image_url: optUrl,
  image_alt: optText(200),
  seo: seoSchema,
  layout: z.enum(['grid', 'guide']).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
});

const productImage = z.object({ url: safeUrl, alt: optText(200), credit: optText(120) });
const affiliateLink = z.object({
  id: id.optional(),
  program_id: id,
  url: safeUrl.refine((v) => /^https?:\/\//.test(v), 'Must be a full URL'),
  label: optText(60),
  is_primary: z.boolean().default(false),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  name: trimmed(200).min(1),
  slug: slug.optional(),
  brand: optText(80),
  short_description: optText(300),
  description: optText(5000),
  category_id: optId,
  subcategory_id: optId,
  amazon_url: optUrl,
  affiliate_url: optUrl,
  asin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{10}$/, 'ASIN is 10 letters/numbers')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  current_price: z.union([z.coerce.number().min(0).max(1_000_000), z.literal(''), z.null()]).optional().transform((v) => (v === '' ? null : v)),
  price_display: optText(40),
  price_source: optText(120),
  price_checked_at: dateTime,
  rating: z.union([z.coerce.number().min(0).max(5), z.literal(''), z.null()]).optional().transform((v) => (v === '' ? null : v)),
  review_count: z.union([z.coerce.number().int().min(0), z.literal(''), z.null()]).optional().transform((v) => (v === '' ? null : v)),
  rating_source: optText(120),
  rating_checked_at: dateTime,
  pros: stringList.optional(),
  cons: stringList.optional(),
  best_for: optText(300),
  not_for: optText(300),
  gift_note: optText(200),
  gift_rank: z.union([z.coerce.number().int().min(1).max(999), z.literal(''), z.null()]).optional().transform((v) => (v === '' ? null : v)),
  editor_note: optText(2000),
  tags: z.array(trimmed(40).toLowerCase()).max(20).optional(),
  placement: z.enum(['editorial', 'featured', 'sponsored']).optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  is_demo: z.boolean().optional(),
  images: z.array(productImage).max(12).optional(),
  affiliate_links: z.array(affiliateLink).max(10).optional(),
});

export const affiliateProgramSchema = z.object({
  name: trimmed(80).min(1),
  slug: slug.optional(),
  network: optText(80),
  base_domain: optText(120),
  tracking_param: optText(40),
  tracking_id: optText(120),
  link_template: optText(600).refine(
    (v) => v == null || (/^https:\/\//i.test(v) && v.includes('{url}')),
    'Link template must start with https:// and contain {url}',
  ),
  active: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Guides
// ---------------------------------------------------------------------------
// Animated scenes rendered in code (see client/src/components/motion).
export const MOTION_SCENES = ['smart-lock-phone', 'power-outage-kit', 'creator-studio'];

const guideProduct = z.object({
  product_id: id,
  label: optText(60),
  note: optText(2000),
  is_primary: z.boolean().default(false),
});

export const guideSchema = z.object({
  title: trimmed(200).min(1),
  slug: slug.optional(),
  subtitle: optText(300),
  excerpt: optText(500),
  quick_answer: optText(1500),
  hero_image: optUrl,
  hero_image_alt: optText(200),
  hero_motion: z.enum(MOTION_SCENES).nullable().optional().or(z.literal('').transform(() => null)),
  author_id: optId,
  primary_category_id: optId,
  status: z.enum(['draft', 'scheduled', 'published', 'archived']).optional(),
  published_at: dateTime,
  content: blocksSchema.optional(),
  pros: stringList.optional(),
  cons: stringList.optional(),
  buying_considerations: blocksSchema.optional(),
  faq: faqList.optional(),
  featured: z.boolean().optional(),
  seo: seoSchema.optional(),
  category_ids: idList.optional(),
  products: z.array(guideProduct).max(60).optional(),
  related_guide_ids: idList.optional(),
  pinterest: z.lazy(() => pinterestFields).nullable().optional(),
});

// ---------------------------------------------------------------------------
// Trends, collections, seasonal, homepage, pages
// ---------------------------------------------------------------------------
export const trendSchema = z.object({
  title: trimmed(120).min(1),
  slug: slug.optional(),
  keyword: optText(120),
  description: optText(1000),
  image_url: optUrl,
  category_id: optId,
  source: optText(120),
  trend_status: z.enum(['trending', 'rising', 'approaching', 'seasonal', 'evergreen']).optional(),
  trend_start: dateTime,
  trend_end: dateTime,
  priority: z.coerce.number().int().min(0).max(1000).optional(),
  sort_order: z.coerce.number().int().optional(),
  active: z.boolean().optional(),
  linked_guide_id: optId,
  linked_category_id: optId,
  linked_url: optUrl,
  seo: seoSchema.optional(),
  growth: optText(20),
  growth_note: optText(60),
  measured_at: dateTime,
  edit: optText(60),
  pinterest: z.lazy(() => pinterestFields).nullable().optional(),
});

export const collectionSchema = z.object({
  title: trimmed(160).min(1),
  slug: slug.optional(),
  description: optText(1000),
  image_url: optUrl,
  seo: seoSchema.optional(),
  featured: z.boolean().optional(),
  active: z.boolean().optional(),
  product_ids: idList.optional(),
  pinterest: z.lazy(() => pinterestFields).nullable().optional(),
});

export const SECTION_TYPES = [
  'hero', 'trending', 'categories', 'featured_guide', 'products', 'guides', 'split_fashion',
  'creator', 'seasonal', 'latest_guides', 'newsletter', 'links', 'text',
];

export const sectionSchema = z.object({
  id: id.optional(),
  key: z.string().trim().max(60).optional(),
  type: z.enum(SECTION_TYPES),
  title: optText(200),
  subtitle: optText(500),
  config: z.record(z.any()).default({}),
  enabled: z.boolean().default(true),
});

export const homepageSchema = z.object({ sections: z.array(sectionSchema).max(40) });

export const seasonalPageSchema = z.object({
  title: trimmed(120).min(1),
  slug: slug.optional(),
  eyebrow: optText(80),
  hero_title: optText(200),
  hero_subtitle: optText(500),
  hero_image: optUrl,
  season_start: dateTime,
  season_end: dateTime,
  is_current: z.boolean().optional(),
  active: z.boolean().optional(),
  sort_order: z.coerce.number().int().optional(),
  seo: seoSchema.optional(),
  sections: z.array(sectionSchema).max(40).optional(),
  pinterest: z.lazy(() => pinterestFields).nullable().optional(),
});

export const pageSchema = z.object({
  title: trimmed(160).min(1),
  slug: slug.optional(),
  summary: optText(500),
  content: blocksSchema.optional(),
  seo: seoSchema.optional(),
  active: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Marketing / media / settings
// ---------------------------------------------------------------------------
export const pinterestFields = z.object({
  title: optText(100),
  description: optText(500),
  image_url: optUrl,
  destination_url: optUrl,
  board: optText(120),
  status: z.enum(['draft', 'ready', 'pinned']).optional(),
});

export const pinterestSchema = pinterestFields.extend({
  entity_type: z.enum(['guide', 'collection', 'trend', 'category', 'seasonal_page', 'product']),
  entity_id: id,
});

export const mediaUpdateSchema = z.object({
  alt: optText(300),
  caption: optText(500),
  credit: optText(120),
  filename: trimmed(200).optional(),
});

export const mediaExternalSchema = z.object({
  url: safeUrl.refine((v) => /^https:\/\//.test(v), 'Must be an https URL'),
  filename: trimmed(200).optional(),
  alt: optText(300),
  caption: optText(500),
  credit: optText(120),
});

export const navItemSchema = z.object({
  id: id.optional(),
  location: z.enum(['header', 'footer_shop', 'footer_guides', 'footer_company', 'footer_legal']),
  label: trimmed(60).min(1),
  url: safeUrl.refine((v) => v.length > 0, 'Required'),
  active: z.boolean().default(true),
});
export const navigationSchema = z.object({ items: z.array(navItemSchema).max(100) });

export const newsletterSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  source: optText(80),
  website: z.string().max(0).optional().or(z.literal('')), // honeypot: must stay empty
});

export const trackClickSchema = z.object({
  product_id: id,
  guide_id: optId,
  category_id: optId,
  affiliate_link_id: optId,
  page_path: optText(500),
  cta_location: optText(60),
  referrer: optText(500),
  utm_source: optText(60),
  session_id: optText(64),
});

export const trackEventSchema = z.object({
  event_type: z.enum(['page_view', 'search', 'trend_click', 'category_click', 'guide_click', 'product_click']),
  entity_type: optText(40),
  entity_id: optId,
  path: optText(500),
  query: optText(200),
  referrer: optText(500),
  utm_source: optText(60),
  session_id: optText(64),
});

export const storeImportSchema = z.object({
  program_id: id,
  handles: z.array(z.string().trim().regex(/^[a-z0-9][a-z0-9-]*$/i, 'Invalid product handle').max(200)).min(1).max(60),
  category_id: optId,
  subcategory_id: optId,
  active: z.boolean().default(false),
  tags: z.array(z.string().trim().toLowerCase().max(40)).max(10).default([]),
});

export const bulkActiveSchema = z.object({ ids: z.array(id).min(1).max(500), active: z.boolean() });

export const reorderSchema = z.object({ ids: z.array(id).min(1).max(500) });
