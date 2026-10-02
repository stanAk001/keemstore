# keemstore — find things worth buying

An editorial shopping publication built to turn Pinterest and search traffic into
Amazon Associates clicks:

> Pinterest/search trend → useful shopping content → product discovery → Amazon click → qualifying purchase → commission

Every recommendation carries context — who it's for, who should skip it, what's
good, what's worth knowing — and everything on the site is editable from `/admin`
without touching code.

- **Stack:** PostgreSQL · Node.js + Express 5 (ES modules) · React 19 + Vite · Tailwind CSS 4 · JWT + bcrypt · Cloudinary
- **Hosting:** API on Render, site on Vercel

---

## Contents

1. [Architecture](#architecture)
2. [Local setup](#local-setup)
3. [Environment variables](#environment-variables)
4. [Database, migrations and seed data](#database-migrations-and-seed-data)
5. [Commands](#commands)
6. [Using the admin](#using-the-admin)
7. [Amazon affiliate setup](#amazon-affiliate-setup)
8. [Cloudinary setup](#cloudinary-setup)
9. [SEO and Pinterest](#seo-and-pinterest)
10. [Deploying: Render (API) + Vercel (site)](#deploying)
11. [Testing](#testing)
12. [Security notes](#security-notes)
13. [Known limitations](#known-limitations)

---

## Architecture

```
firstKDP/
├── server/                     Express API (Render)
│   ├── src/
│   │   ├── server.js           entry point (listen + graceful shutdown)
│   │   ├── app.js              middleware stack and route mounting
│   │   ├── config/             env.js (the only reader of process.env), db.js (pg pool)
│   │   ├── routes/             public.routes.js, admin.routes.js, seo.routes.js
│   │   ├── controllers/        request/response handling per resource
│   │   ├── services/           affiliate links, sections, search, analytics, SEO, media, settings, Pinterest
│   │   ├── models/             SQL for products, guides, categories, trends, collections, seasonal, pages
│   │   ├── middleware/         auth (JWT + roles), validation, rate limits, caching, errors
│   │   ├── validators/         zod schemas for every write
│   │   └── utils/              slugs, SQL builders, request helpers, image sizing
│   ├── db/
│   │   ├── migrations/         numbered .sql files (forward-only)
│   │   ├── migrate.js          migration runner
│   │   ├── seed.js             admin account + demo content
│   │   └── seeds/              demo data + image list
│   └── test/api.test.js        integration tests (node:test)
├── client/                     React SPA (Vercel)
│   ├── middleware.js           Vercel middleware: crawler share pages, sitemap/robots proxy
│   ├── vercel.json             SPA rewrites + cache headers
│   └── src/
│       ├── pages/              public pages (home, guide, category, product, search, trending, seasonal…)
│       ├── components/         layout, ui primitives, product/, cards/, guide/, sections/
│       ├── admin/              admin app (lazy-loaded bundle): pages/ + components/
│       ├── context/            site settings, auth, tracking scope
│       ├── lib/                api client, fetch cache, tracking, image sizing, SEO head, inline formatting
│       └── styles/index.css    design tokens (Tailwind @theme)
├── docs/DATABASE.md            schema reference for pgAdmin
└── render.yaml                 Render blueprint (API + Postgres)
```

**Key design decisions**

- **Raw SQL with `pg`, no ORM.** Queries live in `models/` and are easy to read next to
  the schema in pgAdmin. Column names always come from server-side allow-lists.
- **One place for affiliate URLs.** `services/affiliate.service.js` turns stored data
  into the outbound URL; the React `AffiliateButton` is the only component that
  renders retailer links. Links point straight at the retailer (transparent to
  visitors, compliant with Amazon's rules) and clicks are logged with `sendBeacon`
  so tracking never slows or breaks navigation.
- **Multi-network ready.** `affiliate_programs` + `affiliate_links` let any product
  carry links on other networks; Amazon is just the first program.
- **Structured content, not HTML.** Guides are JSON blocks (heading, paragraph, list,
  image, quote, table, product, comparison, pros/cons, verdict, CTA, FAQ, callout,
  editor's note). Inline formatting is `**bold**`, `*italic*`, `[link](url)`, rendered
  to React elements — nothing is ever injected as HTML.
- **Predefined sections.** The homepage and seasonal pages are ordered lists of
  fixed section types (hero, trending, categories, products grid/rail/numbered…).
  Editors control content and order; the design stays consistent.
- **Honest data.** Prices and ratings are stored with their source and check date and
  shown that way. Seed data has no ratings, uses Amazon *search* links, and is badged "Demo".

---

## Local setup

**Requirements:** Node.js 20+ and PostgreSQL 14+ (pgAdmin optional).

```bash
# 1. Install dependencies (root workspace installs both apps)
npm install

# 2. Create the database (pgAdmin: right-click Databases → Create, or:)
psql -U postgres -c "create database keemstore"

# 3. Configure the server
cp server/.env.example server/.env
#    then edit server/.env: DATABASE_URL, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# 4. Create tables and seed demo content + your admin account
npm run db:migrate
npm run db:seed

# 5. Run API + site together
npm run dev
```

- Site: <http://localhost:5173> · Admin: <http://localhost:5173/admin>
- API: <http://localhost:4000> (health check at `/health`)

**Port already in use?** Set `PORT=4100` (or any free port) in `server/.env`, and
create `client/.env.local` containing `VITE_DEV_API_PROXY=http://localhost:4100`.

## Environment variables

### `server/.env`

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | `postgres://user:password@host:5432/keemstore` |
| `DATABASE_SSL` | | `true` for hosted Postgres that requires SSL from outside its network |
| `JWT_SECRET` | ✅ in prod | 32+ random characters. `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"` |
| `JWT_EXPIRES_IN` | | default `7d` |
| `CLIENT_URL` | ✅ in prod | Public site URL. Used for CORS, canonical URLs and the sitemap |
| `SERVER_URL` | | This API's public URL |
| `CORS_ORIGINS` | | Extra allowed origins, comma separated (e.g. Vercel preview URLs) |
| `CLOUDINARY_CLOUD_NAME` / `_API_KEY` / `_API_SECRET` | | Enables uploads in the media library |
| `CLOUDINARY_FOLDER` | | default `keemstore` |
| `AMAZON_ASSOCIATE_TAG` | | e.g. `yourtag-20`. Can also be set in Admin → Affiliate settings |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | for seeding | `db:seed` creates or resets this admin account |
| `ALLOW_PUBLIC_REGISTRATION` | | `false` to close reader sign-ups |

### `client/.env.local` (development) / Vercel project settings (production)

| Variable | Where | Notes |
|---|---|---|
| `VITE_API_URL` | Vercel | The Render API URL, e.g. `https://keemstore-api.onrender.com`. Leave empty locally |
| `API_URL` | Vercel | Same URL, read by `middleware.js` for share pages and sitemap |
| `VITE_DEV_API_PROXY` | local | Where Vite proxies `/api` in development (default `http://localhost:4000`) |

`.env` files are git-ignored. Never commit real credentials.

## Database, migrations and seed data

- Schema: [`server/db/migrations/001_initial_schema.sql`](server/db/migrations/001_initial_schema.sql)
- Reference and useful queries: [`docs/DATABASE.md`](docs/DATABASE.md)
- **Add a migration:** create `server/db/migrations/002_whatever.sql` and run
  `npm run db:migrate`. Each file runs once, inside a transaction.
- **Seed:** `npm run db:seed` always creates/updates the admin from
  `ADMIN_EMAIL`/`ADMIN_PASSWORD`, and loads demo content only into an empty database
  (15 categories, 27 products, 10 guides — one scheduled — 10 trends, 3 seasonal
  pages, 1 collection, 6 standing pages, navigation and homepage sections).
- **Start over (development only):** `npm run db:reset` drops everything, migrates and seeds.

Demo rows have `is_demo = true` and show a "Demo" badge. Demo images are free
Unsplash photos credited on product pages; demo Amazon links are search links.

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | API (auto-restart) + Vite dev server |
| `npm run build` | Production build of the site into `client/dist` |
| `npm start` | Start the API in production mode |
| `npm run db:migrate` | Apply pending migrations |
| `npm run db:seed` | Admin account + demo content (empty DB only) |
| `npm run db:reset` | Drop, migrate and seed (refuses in production) |
| `npm test` | API integration tests against the configured database |

## Using the admin

Sign in at `/login`. **Admins** can do everything; **editors** manage content, media
and analytics but not settings or users. Readers who register get no admin access.

| Area | What you can do |
|---|---|
| Dashboard | Content counts, clicks (7 days / 30-day chart), top products, guides, categories and traffic sources; warns about products without a retailer link |
| Guides | Create, edit, preview drafts, publish now, schedule, unpublish, archive, duplicate, delete, feature; block editor; ordered picks with a top pick; buying advice; FAQ; SEO; Pinterest |
| Products | Add once, reuse everywhere; images; Amazon URL/ASIN/custom links; links on any affiliate program; price and rating **with source and date**; pros/cons, best for / skip if; editorial vs. featured vs. sponsored placement |
| Categories | Two-level tree, reorder, feature, deactivate, image, SEO, slug |
| Trends | Status (trending, rising, coming up, seasonal, evergreen), schedule window, priority, reorder, link to a guide/category/URL, SEO, Pinterest |
| Seasonal pages | Hero + ordered sections; mark one as the current season for the homepage |
| Pages | About, contact, affiliate disclosure, editorial policy, privacy, terms |
| Pinterest | Every pinnable item with pin title/description/image/URL, copy buttons, "missing pin copy" filter |
| Homepage | Toggle, reorder and configure predefined sections |
| Collections | Curated product lists with their own page |
| Newsletter | Subscribers, export CSV, unsubscribe/delete |
| Analytics | Affiliate clicks by product, guide, category, CTA placement, source and device; content performance (views, clicks, click rate), top searches and trends; ranges: today / 7 / 30 / 90 days |
| Media library | Upload (Cloudinary), add by URL, alt text, captions, credits, copy URL, see where an image is used, delete |
| Settings | Site identity, announcement bar, newsletter copy, footer, SEO defaults and verification tags, affiliate disclosure and button labels, affiliate programs, social links, navigation, users |

**First steps with real content:** set your Associates tag, replace the demo
products (or deactivate them: `update products set active = false where is_demo;`),
write your first guide, then set up the homepage sections to point at it.

## Amazon affiliate setup

1. Join Amazon Associates and get your tracking ID (e.g. `yourtag-20`).
2. Set `AMAZON_ASSOCIATE_TAG` on the server, **or** enter it in Admin → Affiliate
   settings → Amazon → Tracking ID (the admin value wins).
3. On each product, paste your SiteStripe link (Amazon → **Get Link → Text**) into the
   **Amazon affiliate link** box under the product name. It's used exactly as pasted, and
   the editor warns you if the link carries someone else's tag. Plain Amazon URLs (or just
   an ASIN) also work: the site adds `?tag=…` automatically.
4. The disclosure text is in Admin → Affiliate settings and appears on guides,
   product pages and the footer. The full disclosure page is at `/affiliate-disclosure`.

Clicks shown in the dashboard are clicks on this site. Orders and earnings are
only in your Associates reports — the dashboard never estimates them.

**Other networks:** Admin → Affiliate settings → Add program (domain, tracking
parameter, ID), then add links on that program to any product and mark one primary.

## Images, video and live motion scenes

- **Paste a link, it's uploaded.** Paste any `https://` image or video link into an image
  field (or the media library) and it is copied into your Cloudinary account
  automatically; the field then points at your own copy. Without Cloudinary configured,
  the link is saved to the library but still loads from the original site.
- **Video anywhere an image goes.** Any image field accepts an `.mp4`/`.webm` link or an
  uploaded video. It plays silently on a loop, only while visible, and shows a still
  frame for visitors who prefer reduced motion. Uploads: images up to 8 MB, videos up to 60 MB.
- **Live motion scenes.** Animated scenes built into the site in code, so they stay sharp
  at any size and weigh almost nothing. Currently: *Phone: live smart-lock app* (a modern
  phone with a Dynamic Island). Pick one for a guide in **Guides → Hero image → Live motion
  scene**, or for a homepage collage tile in **Homepage → Hero**. New scenes go in
  `client/src/components/motion/` and are registered in `index.jsx` plus `MOTION_SCENES`
  in `server/src/validators/schemas.js`.
- Demo videos come from [Mixkit](https://mixkit.co/license/#videoFree) (free for commercial
  use). Paste them into the media library once Cloudinary is set up so they're served
  from your own account.

## Cloudinary setup

1. Create a Cloudinary account; copy the cloud name, API key and API secret from the dashboard.
2. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` on the server.
3. Uploads are validated (images: JPEG, PNG, WebP, AVIF, GIF ≤ 8 MB; videos: MP4, WebM, MOV ≤ 60 MB; file signature checked).
   The site requests resized, auto-format, auto-quality variants with `srcset`.

Without Cloudinary the media library still works for images added by URL.

## SEO and Pinterest

- Per-page title, description, canonical, Open Graph, X/Twitter and `noindex` on guides,
  categories, trends, seasonal pages, collections and pages.
- Structured data: `Article`, `BreadcrumbList`, `ItemList`, `FAQPage` (only when a guide
  has a FAQ), `WebSite` + `SearchAction`, and a minimal `Product` with no invented offers
  or ratings.
- `sitemap.xml` and `robots.txt` are generated by the API from live content.
- **Crawler share pages.** Pinterest, Facebook, X and similar bots don't run JavaScript.
  `client/middleware.js` sends them to the API's `/share/<path>`, which returns the
  correct meta tags (and the Pinterest pin image/copy for Pinterest's bot). Search
  engines and people get the normal site.
- Pinterest domain verification and Google site verification are fields in Admin → SEO settings.

## Deploying

### 1. API + database on Render

1. Push this repository to GitHub.
2. In Render: **New → Blueprint**, pick the repo. `render.yaml` creates the API
   service and a Postgres database, generates `JWT_SECRET`, and runs migrations
   before each deploy.
3. Fill the prompted variables: `CLIENT_URL` (your Vercel URL/domain), `SERVER_URL`,
   `AMAZON_ASSOCIATE_TAG`, Cloudinary keys, `ADMIN_EMAIL`, `ADMIN_PASSWORD`.
4. After the first deploy, open the service **Shell** and run `npm run db:seed` once
   to create the admin account (and demo content, if you want it).

Without the blueprint: create a Node web service with root directory `server`,
build `npm install --omit=dev`, start `npm start`, health check `/health`. `npm start`
applies any pending migrations before the server starts, so this works on plans without a
pre-deploy step too. If you connect from outside Render's network, set `DATABASE_SSL=true`.

### 2. Site on Vercel

1. **New Project** → import the repo → set **Root Directory** to `client`
   (framework preset: Vite; build `npm run build`; output `dist`).
2. Environment variables: `VITE_API_URL` and `API_URL`, both set to the Render API URL.
3. Deploy, then set `CLIENT_URL` on Render to the final domain and redeploy the API
   (CORS and canonical URLs depend on it). Add preview URLs to `CORS_ORIGINS` if needed.

## Testing

```bash
npm test
```

15 integration tests run the real API against your configured database: login and
registration, JWT and role checks (401/403), category rules (reserved slugs, nesting),
product CRUD with images and affiliate links (tag applied, raw links hidden publicly),
the guide lifecycle (draft, staff-only preview, publish, duplicate, schedule), unsafe-URL
rejection inside content blocks, trend scheduling and reorder, seasonal sections,
homepage builder, click tracking (JSON and `sendBeacon` bodies), search, newsletter
idempotency and honeypot, last-admin protection, sitemap/robots/share pages.
Everything the tests create is removed afterwards.

## Security notes

- Passwords hashed with bcrypt (12 rounds); login is constant-time for unknown emails.
- JWT on every admin request; the user and role are re-read from the database, so
  deactivating a user or changing a role takes effect immediately.
- Role checks on the server for every admin route; settings and users are admin-only.
- zod validation on every write; URL fields accept only `http(s)` or site paths
  (no `javascript:` or `data:`), including URLs inside content blocks.
- Helmet security headers, CORS allow-list, rate limits (API, login, tracking, newsletter),
  1 MB JSON body limit, upload type/size/signature checks, CSV-injection-safe export.
- Content is rendered as React elements — no `dangerouslySetInnerHTML` anywhere.
- The admin token is stored in `localStorage`; keep third-party scripts off the site.

## Known limitations

- The site is a client-rendered SPA. Google renders JavaScript and receives full
  meta tags and structured data; link-preview bots get the server share pages. If you
  later need server-rendered HTML for every visitor, add prerendering in front of Vercel.
- The newsletter stores subscribers and exports CSV; it doesn't send email.
  Import the CSV into your email service.
- No live Amazon Product Advertising API integration: prices and ratings are entered
  manually with their source and date. The schema is ready for an automated refresh.
- The legal pages are sensible starting points, not legal advice — review them for
  your jurisdiction.
