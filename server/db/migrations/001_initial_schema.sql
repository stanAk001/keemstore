-- ============================================================================
-- keemstore — initial schema
-- Every table has a surrogate integer PK, created_at/updated_at timestamps,
-- and explicit foreign keys so the relationships are visible in pgAdmin's ERD.
-- SEO metadata is stored as a JSONB `seo` column on each public content table
-- (see docs/DATABASE.md for the shape).
-- ============================================================================

create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- Users & roles
-- ---------------------------------------------------------------------------
create table roles (
  id          serial primary key,
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

insert into roles (name, description) values
  ('admin',  'Full access, including users and settings'),
  ('editor', 'Can manage content, products and media'),
  ('user',   'Registered reader, no admin access');

create table users (
  id            serial primary key,
  email         text not null,
  password_hash text not null,
  display_name  text not null,
  bio           text,
  avatar_url    text,
  role_id       integer not null references roles(id),
  active        boolean not null default true,
  last_login_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index users_email_lower_key on users (lower(email));
create index users_role_idx on users (role_id);

-- ---------------------------------------------------------------------------
-- Categories (self-referencing: a row with parent_id is a subcategory)
-- ---------------------------------------------------------------------------
create table categories (
  id          serial primary key,
  parent_id   integer references categories(id) on delete set null,
  name        text not null,
  slug        text not null unique,
  description text,
  intro       text,
  image_url   text,
  image_alt   text,
  seo         jsonb not null default '{}'::jsonb,
  featured    boolean not null default false,
  active      boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (parent_id is null or parent_id <> id)
);
create index categories_parent_idx on categories (parent_id);
create index categories_active_sort_idx on categories (active, sort_order);

-- Convenience view so subcategories can be inspected as their own "table".
create view subcategories as
  select c.id, c.parent_id, p.name as parent_name, c.name, c.slug, c.description,
         c.active, c.sort_order, c.created_at, c.updated_at
  from categories c join categories p on p.id = c.parent_id;

-- ---------------------------------------------------------------------------
-- Affiliate programs (Amazon first, others later)
-- ---------------------------------------------------------------------------
create table affiliate_programs (
  id             serial primary key,
  name           text not null,
  slug           text not null unique,
  network        text,
  base_domain    text,
  tracking_param text,
  tracking_id    text,
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Products
-- ---------------------------------------------------------------------------
create table products (
  id                serial primary key,
  name              text not null,
  slug              text not null unique,
  brand             text,
  short_description text,
  description       text,
  category_id       integer references categories(id) on delete set null,
  subcategory_id    integer references categories(id) on delete set null,
  amazon_url        text,
  affiliate_url     text,
  asin              text,
  current_price     numeric(10,2) check (current_price is null or current_price >= 0),
  price_display     text,
  price_source      text,
  price_checked_at  timestamptz,
  rating            numeric(2,1) check (rating is null or (rating >= 0 and rating <= 5)),
  review_count      integer check (review_count is null or review_count >= 0),
  rating_source     text,
  rating_checked_at timestamptz,
  pros              jsonb not null default '[]'::jsonb,
  cons              jsonb not null default '[]'::jsonb,
  best_for          text,
  not_for           text,
  editor_note       text,
  tags              text[] not null default '{}',
  placement         text not null default 'editorial'
                    check (placement in ('editorial', 'featured', 'sponsored')),
  featured          boolean not null default false,
  active            boolean not null default true,
  is_demo           boolean not null default false,
  search            tsvector generated always as (
                      setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
                      setweight(to_tsvector('english', coalesce(brand, '')), 'B') ||
                      setweight(to_tsvector('english', coalesce(short_description, '')), 'B') ||
                      setweight(to_tsvector('english', coalesce(best_for, '')), 'C') ||
                      setweight(to_tsvector('english', coalesce(description, '')), 'D')
                    ) stored,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index products_category_idx on products (category_id);
create index products_subcategory_idx on products (subcategory_id);
create index products_active_featured_idx on products (active, featured);
create index products_price_idx on products (current_price);
create index products_brand_idx on products (lower(brand));
create index products_tags_idx on products using gin (tags);
create index products_search_idx on products using gin (search);
create unique index products_asin_key on products (asin) where asin is not null;

create table product_images (
  id         serial primary key,
  product_id integer not null references products(id) on delete cascade,
  url        text not null,
  alt        text,
  credit     text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index product_images_product_idx on product_images (product_id, sort_order);

create table affiliate_links (
  id         serial primary key,
  product_id integer not null references products(id) on delete cascade,
  program_id integer not null references affiliate_programs(id) on delete restrict,
  url        text not null,
  label      text,
  is_primary boolean not null default false,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index affiliate_links_product_idx on affiliate_links (product_id);
create unique index affiliate_links_one_primary on affiliate_links (product_id) where is_primary;

-- ---------------------------------------------------------------------------
-- Buying guides
-- ---------------------------------------------------------------------------
create table guides (
  id                    serial primary key,
  title                 text not null,
  slug                  text not null unique,
  subtitle              text,
  excerpt               text,
  quick_answer          text,
  hero_image            text,
  hero_image_alt        text,
  author_id             integer references users(id) on delete set null,
  primary_category_id   integer references categories(id) on delete set null,
  status                text not null default 'draft'
                        check (status in ('draft', 'scheduled', 'published', 'archived')),
  published_at          timestamptz,
  content               jsonb not null default '[]'::jsonb,
  pros                  jsonb not null default '[]'::jsonb,
  cons                  jsonb not null default '[]'::jsonb,
  buying_considerations jsonb not null default '[]'::jsonb,
  faq                   jsonb not null default '[]'::jsonb,
  featured              boolean not null default false,
  seo                   jsonb not null default '{}'::jsonb,
  is_demo               boolean not null default false,
  search                tsvector generated always as (
                          setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
                          setweight(to_tsvector('english', coalesce(subtitle, '')), 'B') ||
                          setweight(to_tsvector('english', coalesce(excerpt, '')), 'C')
                        ) stored,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index guides_status_published_idx on guides (status, published_at desc);
create index guides_category_idx on guides (primary_category_id);
create index guides_author_idx on guides (author_id);
create index guides_search_idx on guides using gin (search);

create table guide_categories (
  guide_id    integer not null references guides(id) on delete cascade,
  category_id integer not null references categories(id) on delete cascade,
  primary key (guide_id, category_id)
);
create index guide_categories_category_idx on guide_categories (category_id);

create table guide_products (
  id         serial primary key,
  guide_id   integer not null references guides(id) on delete cascade,
  product_id integer not null references products(id) on delete cascade,
  position   integer not null default 0,
  label      text,
  note       text,
  is_primary boolean not null default false,
  unique (guide_id, product_id)
);
create index guide_products_product_idx on guide_products (product_id);

create table guide_related (
  guide_id         integer not null references guides(id) on delete cascade,
  related_guide_id integer not null references guides(id) on delete cascade,
  position         integer not null default 0,
  primary key (guide_id, related_guide_id),
  check (guide_id <> related_guide_id)
);

-- ---------------------------------------------------------------------------
-- Product collections (e.g. "Under $25", "Lazy but useful")
-- ---------------------------------------------------------------------------
create table collections (
  id          serial primary key,
  title       text not null,
  slug        text not null unique,
  description text,
  image_url   text,
  seo         jsonb not null default '{}'::jsonb,
  featured    boolean not null default false,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table collection_products (
  collection_id integer not null references collections(id) on delete cascade,
  product_id    integer not null references products(id) on delete cascade,
  position      integer not null default 0,
  primary key (collection_id, product_id)
);
create index collection_products_product_idx on collection_products (product_id);

-- ---------------------------------------------------------------------------
-- Trends
-- ---------------------------------------------------------------------------
create table trends (
  id                 serial primary key,
  title              text not null,
  slug               text not null unique,
  keyword            text,
  description        text,
  image_url          text,
  category_id        integer references categories(id) on delete set null,
  source             text,
  trend_status       text not null default 'trending'
                     check (trend_status in ('trending', 'rising', 'approaching', 'seasonal', 'evergreen')),
  trend_start        timestamptz,
  trend_end          timestamptz,
  priority           integer not null default 0,
  sort_order         integer not null default 0,
  active             boolean not null default true,
  linked_guide_id    integer references guides(id) on delete set null,
  linked_category_id integer references categories(id) on delete set null,
  linked_url         text,
  seo                jsonb not null default '{}'::jsonb,
  is_demo            boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (trend_end is null or trend_start is null or trend_end > trend_start)
);
create index trends_active_window_idx on trends (active, trend_start, trend_end);
create index trends_sort_idx on trends (priority desc, sort_order);

-- ---------------------------------------------------------------------------
-- Seasonal landing pages & their sections
-- ---------------------------------------------------------------------------
create table seasonal_pages (
  id            serial primary key,
  title         text not null,
  slug          text not null unique,
  eyebrow       text,
  hero_title    text,
  hero_subtitle text,
  hero_image    text,
  season_start  date,
  season_end    date,
  is_current    boolean not null default false,
  active        boolean not null default true,
  sort_order    integer not null default 0,
  seo           jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index seasonal_pages_one_current on seasonal_pages (is_current) where is_current;

-- Section `type` values are shared with homepage_sections; config holds ids.
create table seasonal_sections (
  id         serial primary key,
  page_id    integer not null references seasonal_pages(id) on delete cascade,
  type       text not null,
  title      text,
  subtitle   text,
  config     jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index seasonal_sections_page_idx on seasonal_sections (page_id, sort_order);

-- ---------------------------------------------------------------------------
-- Homepage builder (predefined section types, orderable)
-- ---------------------------------------------------------------------------
create table homepage_sections (
  id         serial primary key,
  key        text not null unique,
  type       text not null,
  title      text,
  subtitle   text,
  config     jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  enabled    boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Static pages (About, Affiliate disclosure, Privacy, ...)
-- ---------------------------------------------------------------------------
create table pages (
  id         serial primary key,
  title      text not null,
  slug       text not null unique,
  summary    text,
  content    jsonb not null default '[]'::jsonb,
  seo        jsonb not null default '{}'::jsonb,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Pinterest metadata (one row per piece of content)
-- ---------------------------------------------------------------------------
create table pinterest_metadata (
  id              serial primary key,
  entity_type     text not null
                  check (entity_type in ('guide', 'collection', 'trend', 'category', 'seasonal_page', 'product')),
  entity_id       integer not null,
  title           text,
  description     text,
  image_url       text,
  destination_url text,
  board           text,
  status          text not null default 'draft' check (status in ('draft', 'ready', 'pinned')),
  pinned_at       timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (entity_type, entity_id)
);

-- ---------------------------------------------------------------------------
-- Media library (Cloudinary-backed, or external URLs)
-- ---------------------------------------------------------------------------
create table media (
  id          serial primary key,
  public_id   text unique,
  url         text not null,
  filename    text not null,
  alt         text,
  caption     text,
  credit      text,
  type        text not null default 'image',
  format      text,
  width       integer,
  height      integer,
  bytes       integer,
  uploaded_by integer references users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index media_created_idx on media (created_at desc);

-- ---------------------------------------------------------------------------
-- First-party analytics
-- ---------------------------------------------------------------------------
create table affiliate_clicks (
  id                bigserial primary key,
  product_id        integer references products(id) on delete set null,
  guide_id          integer references guides(id) on delete set null,
  category_id       integer references categories(id) on delete set null,
  affiliate_link_id integer references affiliate_links(id) on delete set null,
  program_id        integer references affiliate_programs(id) on delete set null,
  page_path         text,
  cta_location      text,
  device            text,
  referrer          text,
  source            text,
  session_id        text,
  created_at        timestamptz not null default now()
);
create index affiliate_clicks_created_idx on affiliate_clicks (created_at desc);
create index affiliate_clicks_product_idx on affiliate_clicks (product_id, created_at);
create index affiliate_clicks_guide_idx on affiliate_clicks (guide_id, created_at);
create index affiliate_clicks_category_idx on affiliate_clicks (category_id, created_at);

create table analytics_events (
  id          bigserial primary key,
  event_type  text not null
              check (event_type in ('page_view', 'search', 'trend_click', 'category_click', 'guide_click', 'product_click')),
  entity_type text,
  entity_id   integer,
  path        text,
  query       text,
  referrer    text,
  source      text,
  device      text,
  session_id  text,
  created_at  timestamptz not null default now()
);
create index analytics_events_type_created_idx on analytics_events (event_type, created_at desc);
create index analytics_events_entity_idx on analytics_events (entity_type, entity_id);

-- ---------------------------------------------------------------------------
-- Settings, navigation, newsletter
-- ---------------------------------------------------------------------------
create table site_settings (
  key        text primary key,
  value      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table navigation_items (
  id         serial primary key,
  location   text not null
             check (location in ('header', 'footer_shop', 'footer_guides', 'footer_company', 'footer_legal')),
  label      text not null,
  url        text not null,
  sort_order integer not null default 0,
  active     boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index navigation_items_location_idx on navigation_items (location, sort_order);

create table newsletter_subscribers (
  id              serial primary key,
  email           text not null,
  source          text,
  status          text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unsubscribed_at timestamptz
);
create unique index newsletter_subscribers_email_key on newsletter_subscribers (lower(email));

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'users', 'categories', 'affiliate_programs', 'products', 'affiliate_links', 'guides',
    'collections', 'trends', 'seasonal_pages', 'seasonal_sections', 'homepage_sections',
    'pages', 'pinterest_metadata', 'media', 'site_settings', 'navigation_items',
    'newsletter_subscribers'
  ] loop
    execute format('create trigger %I_set_updated_at before update on %I
                    for each row execute function set_updated_at()', t, t);
  end loop;
end $$;
