# Database reference

PostgreSQL 14+ (tested on 18). The full DDL is in
[`server/db/migrations/001_initial_schema.sql`](../server/db/migrations/001_initial_schema.sql) —
open it in pgAdmin's Query Tool to read or re-run it. Applied migrations are
recorded in `schema_migrations`.

In pgAdmin, right-click the database → **ERD For Database** to see every table
and foreign key drawn out.

## Conventions

- Integer surrogate keys (`id serial`), URL-safe unique `slug` on public content.
- `created_at` / `updated_at` on every mutable table; `updated_at` is maintained by
  the `set_updated_at()` trigger, so you never set it by hand.
- Public content tables carry a JSONB `seo` column (shape below) instead of a
  dozen nullable columns each.
- `is_demo = true` marks seeded demo rows (shown with a "Demo" badge on the site).
  Remove them with `delete from products where is_demo;` etc. once real content exists.

### `seo` JSON shape

```json
{
  "title": "…", "description": "…", "canonical": "https://…", "focus_keyword": "…",
  "og_title": "…", "og_description": "…", "og_image": "https://…",
  "twitter_title": "…", "twitter_description": "…", "twitter_image": "https://…",
  "noindex": false
}
```

All keys are optional; empty values fall back to the content's own title/summary/image.

## Tables

| Table | Purpose | Key relationships |
|---|---|---|
| `roles` | `admin`, `editor`, `user` | — |
| `users` | Accounts (bcrypt hashes) and author bylines | `role_id → roles` |
| `categories` | Two-level category tree | `parent_id → categories` (null = top level) |
| `subcategories` *(view)* | Categories that have a parent, for easy browsing | view over `categories` |
| `affiliate_programs` | Amazon + any future network; tracking parameter & ID | — |
| `products` | The reusable product catalogue | `category_id`, `subcategory_id → categories` |
| `product_images` | Ordered images per product | `product_id → products` (cascade) |
| `affiliate_links` | Per-product links on any program; one `is_primary` per product | `product_id → products`, `program_id → affiliate_programs` |
| `guides` | Buying guides; `content`, `buying_considerations`, `faq` are JSON block lists | `author_id → users`, `primary_category_id → categories` |
| `guide_products` | A guide's ordered picks, with per-guide label/note and one top pick | `guide_id → guides`, `product_id → products` |
| `guide_categories` | Secondary categories for a guide | many-to-many |
| `guide_related` | Hand-picked related guides | guide ↔ guide |
| `collections` / `collection_products` | Curated product lists (`/collections/:slug`) | many-to-many with products |
| `trends` | Trending searches with schedule window, status and priority | `category_id`, `linked_category_id → categories`, `linked_guide_id → guides` |
| `seasonal_pages` / `seasonal_sections` | Seasonal landing pages and their ordered sections | sections cascade with their page |
| `homepage_sections` | Homepage builder: ordered, predefined section types | — |
| `pages` | About, disclosure, privacy… (JSON blocks) | — |
| `pinterest_metadata` | Pin title/description/image/URL per piece of content | polymorphic: `(entity_type, entity_id)` unique |
| `media` | Media library (Cloudinary uploads or external URLs) | `uploaded_by → users` |
| `affiliate_clicks` | One row per outbound retailer click | product, guide, category, link, program |
| `analytics_events` | Page views, searches, trend/category/guide/product clicks | `(entity_type, entity_id)` |
| `site_settings` | Key → JSON settings groups (`site`, `seo`, `affiliate`…) | — |
| `navigation_items` | Header and footer menus | — |
| `newsletter_subscribers` | Email sign-ups (case-insensitive unique) | — |

## How the important bits work

**Publishing.** A guide is public when `status in ('published','scheduled')` and
`published_at <= now()`. Scheduling needs no cron job — the guide appears when its
time passes.

**Trends.** Public when `active` and inside `trend_start … trend_end` (either end may
be null). Where a trend links to is resolved in this order: `linked_url`, linked
guide, linked category, else its own `/trending/:slug` page.

**Outbound links.** Resolved in `server/src/services/affiliate.service.js`:
primary active `affiliate_links` row → any active link → `products.affiliate_url`
→ `products.amazon_url` (+ tag) → `https://www.amazon.com/dp/<asin>` (+ tag). The
Amazon tag comes from the Amazon program's `tracking_id`, or `AMAZON_ASSOCIATE_TAG`.

**Search.** `products.search` and `guides.search` are generated `tsvector` columns
with GIN indexes (weighted: name/title highest).

**Section configs.** `homepage_sections.config` and `seasonal_sections.config` store
ids and options, for example:

```json
{ "source": "tag", "tag": "lazy", "limit": 5, "variant": "numbered",
  "link": { "label": "All lazy-but-useful finds", "url": "/lazy-but-useful" } }
```

## Useful queries

```sql
-- Clicks per guide, last 30 days
select g.title, count(*) as clicks
from affiliate_clicks a join guides g on g.id = a.guide_id
where a.created_at > now() - interval '30 days'
group by g.title order by clicks desc;

-- Products with no working retailer link
select id, name from products p
where active and amazon_url is null and affiliate_url is null and asin is null
  and not exists (select 1 from affiliate_links l where l.product_id = p.id and l.active);

-- Which guides a product appears in
select g.title, gp.label from guide_products gp join guides g on g.id = gp.guide_id
where gp.product_id = 1;
```
