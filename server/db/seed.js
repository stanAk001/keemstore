// Seeds roles/admin (always) and demo content (only into an empty database).
//   node db/seed.js   admin account (from ADMIN_EMAIL/ADMIN_PASSWORD) + demo content if the DB has no categories
//   npm run db:reset  wipe, migrate and re-seed (development)
import crypto from 'node:crypto';
import bcrypt from 'bcrypt';
import { pool, transaction } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import * as D from './seeds/data.js';
import { seedCatalog } from './seed-catalog.js';
import { up as giftGuide } from './migrations/005_gift_guide_content.js';

async function seedAdmin(client) {
  if (!env.adminEmail || !env.adminPassword) {
    console.log('[seed] ADMIN_EMAIL / ADMIN_PASSWORD not set — skipping admin account');
    return null;
  }
  if (env.adminPassword.length < 10) throw new Error('ADMIN_PASSWORD must be at least 10 characters');
  const hash = await bcrypt.hash(env.adminPassword, 12);
  const { rows } = await client.query(
    `insert into users (email, password_hash, display_name, role_id)
     values ($1, $2, 'Site Admin', (select id from roles where name = 'admin'))
     on conflict (lower(email)) do update set password_hash = excluded.password_hash,
       role_id = excluded.role_id, active = true
     returning id`,
    [env.adminEmail.toLowerCase(), hash],
  );
  console.log(`[seed] admin account ready: ${env.adminEmail}`);
  return rows[0].id;
}

async function seedContent(client) {
  const q = (text, params) => client.query(text, params).then((r) => r.rows);
  const one = async (text, params) => (await q(text, params))[0];

  // Editorial byline account. Inactive, random password: it can't sign in.
  const desk = await one(
    `insert into users (email, password_hash, display_name, bio, role_id, active)
     values ('desk@keemstore.invalid', $1, 'The keemstore Desk',
             'Our editors research, compare and update every guide on the site.',
             (select id from roles where name = 'editor'), false)
     on conflict (lower(email)) do update set display_name = excluded.display_name returning id`,
    [await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 12)],
  );

  // Affiliate program
  await q(`insert into affiliate_programs (name, slug, network, base_domain, tracking_param)
           values ('Amazon', 'amazon', 'Amazon Associates', 'amazon.com', 'tag') on conflict (slug) do nothing`);

  // Categories
  const cat = {};
  for (const [i, c] of D.categories.entries()) {
    const row = await one(
      `insert into categories (name, slug, description, intro, image_url, image_alt, featured, sort_order, seo)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9) returning id`,
      [c.name, c.slug, c.description, c.intro ?? null, c.video || D.img(c.image), D.alt(c.image), Boolean(c.featured), i,
        JSON.stringify({ title: `${c.name}: things worth buying`, description: c.description })],
    );
    cat[c.slug] = row.id;
    for (const [j, k] of (c.children || []).entries()) {
      const child = await one(
        `insert into categories (parent_id, name, slug, description, image_url, image_alt, sort_order, seo)
         values ($1, $2, $3, $4, $5, $6, $7, $8) returning id`,
        [row.id, k.name, k.slug, k.description, D.img(k.image), D.alt(k.image), j,
          JSON.stringify({ title: `${k.name} finds worth buying`, description: k.description })],
      );
      cat[k.slug] = child.id;
    }
  }

  // Products
  const prod = {};
  const today = new Date().toISOString();
  for (const p of D.products) {
    const slug = p.name.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const row = await one(
      `insert into products (name, slug, short_description, description, category_id, subcategory_id, amazon_url,
                             current_price, price_display, price_source, price_checked_at, pros, cons, best_for, not_for,
                             editor_note, tags, featured, is_demo)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Demo estimate — not a live price', $10, $11, $12, $13, $14, $15, $16, $17, true)
       returning id`,
      [p.name, slug, p.short, `${p.short} ${p.best_for}`, cat[p.category], p.sub ? cat[p.sub] : null,
        `https://www.amazon.com/s?k=${encodeURIComponent(p.name)}`, p.price, `$${Math.round(p.price)}`, today,
        JSON.stringify(p.pros), JSON.stringify(p.cons), p.best_for, p.not_for, p.note, p.tags,
        ['smartplug', 'robotvac', 'sunrise', 'powerbank', 'mic', 'trenchcoat', 'headphones', 'overshirt'].includes(p.key)],
    );
    prod[p.key] = row.id;
    await q('insert into product_images (product_id, url, alt, credit) values ($1, $2, $3, $4)', [row.id, D.img(p.key), p.name, D.credit(p.key)]);
  }

  // Guides
  const guide = {};
  for (const g of D.guides) {
    const status = g.scheduled ? 'scheduled' : 'published';
    const publishedAt = g.scheduled || new Date(Date.now() - Math.floor(Math.random() * 20 + 1) * 86400000).toISOString();
    const row = await one(
      `insert into guides (title, slug, subtitle, excerpt, quick_answer, hero_image, hero_image_alt, hero_motion, author_id,
                           primary_category_id, status, published_at, content, pros, cons, buying_considerations, faq,
                           featured, seo, is_demo)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, true) returning id`,
      [g.title, g.slug, g.subtitle, g.excerpt, g.quick, D.img(g.image), D.alt(g.image), g.motion ?? null, desk.id, cat[g.category], status,
        publishedAt, JSON.stringify(g.content), JSON.stringify(g.pros), JSON.stringify(g.cons),
        JSON.stringify(g.considerations), JSON.stringify(g.faq), Boolean(g.featured),
        JSON.stringify({ title: g.title, description: g.excerpt, focus_keyword: g.title.toLowerCase() })],
    );
    guide[g.slug] = row.id;
    for (const extra of g.extra || []) {
      await q('insert into guide_categories (guide_id, category_id) values ($1, $2) on conflict do nothing', [row.id, cat[extra]]);
    }
    for (const [i, [key, label, primary]] of g.picks.entries()) {
      await q('insert into guide_products (guide_id, product_id, position, label, is_primary) values ($1, $2, $3, $4, $5)',
        [row.id, prod[key], i, label, Boolean(primary)]);
    }
    await q(`insert into pinterest_metadata (entity_type, entity_id, title, description, image_url, destination_url, status)
             values ('guide', $1, $2, $3, $4, $5, 'ready')`,
      [row.id, g.title, `${g.excerpt} Who each pick is for, and who should skip it.`, D.img(g.image), `${env.clientUrl}/guides/${g.slug}`]);
  }
  // Related guides (simple pairs)
  const related = [
    ['best-smart-home-gadgets-worth-buying', 'best-lazy-but-useful-gadgets'],
    ['best-smart-home-gadgets-worth-buying', 'best-bedroom-gadgets'],
    ['best-content-creator-gadgets', 'best-gadgets-for-working-during-a-power-outage'],
    ['best-womens-amazon-fashion-finds', 'best-mens-amazon-fashion-finds'],
    ['best-mens-amazon-fashion-finds', 'best-womens-amazon-fashion-finds'],
  ];
  for (const [i, [a, b]] of related.entries()) {
    await q('insert into guide_related (guide_id, related_guide_id, position) values ($1, $2, $3)', [guide[a], guide[b], i]);
  }

  // Trends
  for (const [i, t] of D.trends.entries()) {
    const slug = t.title.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    const row = await one(
      `insert into trends (title, slug, keyword, description, image_url, category_id, source, trend_status, trend_start,
                           trend_end, priority, sort_order, linked_guide_id, linked_category_id, linked_url, is_demo)
       values ($1, $2, $3, $4, $5, $6, 'Demo — replace with Pinterest Trends data', $7, $8, $9, $10, $11, $12, $13, $14, true)
       returning id`,
      [t.title, slug, t.keyword, `What people are searching for around ${t.title.toLowerCase()}, with the guides and products that fit.`,
        D.img(t.image), t.category ? cat[t.category] : null, t.status, t.start ?? null, t.end ?? null, t.priority, i,
        t.guide ? guide[t.guide] : null, t.category ? cat[t.category] : null, t.url ?? null],
    );
    await q(`insert into pinterest_metadata (entity_type, entity_id, title, description, image_url, status)
             values ('trend', $1, $2, $3, $4, 'draft')`, [row.id, `${t.title}: ideas worth saving`, `Trending now: ${t.keyword}.`, D.img(t.image)]);
  }

  // Collections
  const under25 = await one(
    `insert into collections (title, slug, description, image_url, featured, seo) values
     ('Under $25', 'under-25', 'Cheap, but not throwaway. Small things that stay useful.', $1, true, $2) returning id`,
    [D.img('deals'), JSON.stringify({ title: 'Useful finds under $25', description: 'Low-cost products that stay useful.' })],
  );
  for (const [i, key] of ['smartplug', 'lightstrip', 'tripod', 'bottle', 'costume', 'halloween'].entries()) {
    await q('insert into collection_products values ($1, $2, $3)', [under25.id, prod[key], i]);
  }
  await q(`insert into pinterest_metadata (entity_type, entity_id, title, description, image_url, status)
           values ('collection', $1, 'Useful Amazon finds under $25', 'Small, cheap upgrades that stay useful.', $2, 'draft')`,
    [under25.id, D.img('deals')]);

  // Seasonal pages + sections
  for (const [i, s] of D.seasonal.entries()) {
    const row = await one(
      `insert into seasonal_pages (title, slug, eyebrow, hero_title, hero_subtitle, hero_image, season_start, season_end,
                                   is_current, sort_order, seo)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) returning id`,
      [s.title, s.slug, s.eyebrow, s.hero_title, s.hero_subtitle, s.video || D.img(s.image), s.start, s.end, Boolean(s.current), i,
        JSON.stringify({ title: `${s.title} finds and ideas`, description: s.hero_subtitle })],
    );
    const sections = [
      { type: 'trending', title: 'What people are searching', config: {} },
      { type: 'products', title: `${s.title} finds`, subtitle: 'Picked for the season.', config: { source: 'tag', tag: s.slug, limit: 8 } },
      { type: 'guides', title: 'Guides for the season', config: { category_ids: [cat['seasonal-finds'], cat.gifts] } },
      { type: 'products', title: 'Gift ideas', config: { source: 'tag', tag: 'gifts', limit: 4, variant: 'rail' } },
      { type: 'categories', title: 'Shop by category', config: { category_ids: [cat.fashion, cat.gadgets, cat.home, cat.gifts] } },
      { type: 'links', title: 'Related searches', config: { links: [
        { label: `${s.title} outfits`, url: `/search?q=${encodeURIComponent(s.title + ' outfit')}` },
        { label: `${s.title} decor`, url: `/search?q=${encodeURIComponent(s.title + ' decor')}` },
        { label: `${s.title} gifts`, url: '/gifts' },
      ] } },
    ];
    for (const [j, sec] of sections.entries()) {
      await q('insert into seasonal_sections (page_id, type, title, subtitle, config, sort_order) values ($1, $2, $3, $4, $5, $6)',
        [row.id, sec.type, sec.title, sec.subtitle ?? null, JSON.stringify(sec.config), j]);
    }
  }

  // Homepage sections (predefined, reorderable in the admin)
  const heroLabels = { headphones: 'Personal tech', trenchcoat: 'Outerwear', sunrise: 'Smart home', mic: 'Creator', kettle: 'Lazy mornings' };
  const heroImages = Object.keys(heroLabels).map((k) => ({ url: D.img(k), alt: D.alt(k), label: heroLabels[k], href: '' }));
  heroImages[2].motion = 'smart-lock-phone'; // live animated phone tile
  heroImages[4] = { ...heroImages[4], url: 'https://assets.mixkit.co/videos/43941/43941-720.mp4', alt: 'Coffee being poured into a cup' };
  heroImages[0].href = '/gadgets/personal';
  heroImages[1].href = '/fashion/women';
  heroImages[2].href = '/gadgets/smart-home';
  heroImages[3].href = '/creator-work';
  heroImages[4].href = '/lazy-but-useful';
  const home = [
    ['hero', 'hero', null, null, {
      eyebrow: 'Autumn edition',
      headline: 'Find things *worth* {rotate}.',
      rotating_words: ['keeping', 'gifting', 'owning'],
      show_ticker: true,
      subtext: 'Smart gadgets, useful finds, fashion and products people are actually looking for — with honest notes on who each one is for.',
      primary_cta: { label: 'Explore trending finds', url: '/trending' },
      secondary_cta: { label: 'Browse buying guides', url: '/guides' },
      images: heroImages,
    }],
    ['trending', 'trending', 'People are looking for these right now', 'Updated as searches shift through the season.', { limit: 8 }],
    ['categories', 'categories', 'Start with a room, a person or a problem', null, {
      category_ids: [cat.gadgets, cat.home, cat.fashion, cat['creator-work'], cat['seasonal-finds']] }],
    ['featured-guide', 'featured_guide', null, null, { guide_id: guide['best-smart-home-gadgets-worth-buying'] }],
    ['worth-a-look', 'products', 'Things we think are worth a closer look', 'Each with a note on who it suits — and who should skip it.', { source: 'featured', limit: 8, variant: 'grid' }],
    ['lazy', 'products', 'Lazy? Same.', 'These gadgets make life easier.', { source: 'tag', tag: 'lazy', limit: 5, variant: 'numbered', link: { label: 'All lazy-but-useful finds', url: '/lazy-but-useful' } }],
    ['fashion', 'split_fashion', 'Wardrobe, considered', null, { per_panel: 3, panels: [
      { title: 'Women', subtitle: 'Layers, bags and pieces that last.', image: D.img('fashionw'), category_id: cat.women },
      { title: 'Men', subtitle: 'Easy basics, upgraded.', image: D.img('fashionm'), category_id: cat.men },
    ] }],
    ['creator', 'creator', 'Creator & work', 'Content creator gadgets, desk upgrades and a plan for when the power goes out.', {
      category_ids: [cat['creator-work'], cat['home-office'], cat['power-outage']], limit: 4 }],
    ['seasonal', 'seasonal', null, null, { limit: 4 }],
    ['under-25', 'products', 'Under $25', 'Cheap, but not throwaway.', { source: 'under_price', max_price: 25, limit: 8, variant: 'rail', link: { label: 'See the collection', url: '/collections/under-25' } }],
    ['latest', 'latest_guides', 'Latest buying guides', null, { limit: 6 }],
    ['newsletter', 'newsletter', null, null, {}],
  ];
  for (const [i, [key, type, title, subtitle, config]] of home.entries()) {
    await q('insert into homepage_sections (key, type, title, subtitle, config, sort_order) values ($1, $2, $3, $4, $5, $6)',
      [key, type, title, subtitle, JSON.stringify(config), i]);
  }

  // Static pages
  for (const pg of D.pages) {
    await q('insert into pages (title, slug, summary, content, seo) values ($1, $2, $3, $4, $5)',
      [pg.title, pg.slug, pg.summary, JSON.stringify(pg.content), JSON.stringify({ description: pg.summary })]);
  }

  // Navigation
  const nav = [
    ['header', 'Gadgets', '/gadgets'], ['header', 'Home', '/home'], ['header', 'Fashion', '/fashion'],
    ['header', 'Creator', '/creator-work'], ['header', 'Guides', '/guides'], ['header', 'Trending', '/trending'],
    ['footer_shop', 'Gadgets', '/gadgets'], ['footer_shop', 'Smart home', '/gadgets/smart-home'], ['footer_shop', 'Home', '/home'],
    ['footer_shop', 'Fashion', '/fashion'], ['footer_shop', 'Creator & work', '/creator-work'], ['footer_shop', 'Gifts', '/gifts'],
    ['footer_guides', 'All buying guides', '/guides'], ['footer_guides', 'Trending now', '/trending'],
    ['footer_guides', 'Seasonal', '/seasonal'], ['footer_guides', 'Under $25', '/collections/under-25'],
    ['footer_company', 'About', '/about'], ['footer_company', 'Editorial policy', '/editorial-policy'], ['footer_company', 'Contact', '/contact'],
    ['footer_legal', 'Affiliate disclosure', '/affiliate-disclosure'], ['footer_legal', 'Privacy', '/privacy'], ['footer_legal', 'Terms', '/terms'],
  ];
  const pos = {};
  for (const [location, label, url] of nav) {
    pos[location] = (pos[location] ?? -1) + 1;
    await q('insert into navigation_items (location, label, url, sort_order) values ($1, $2, $3, $4)', [location, label, url, pos[location]]);
  }

  console.log(`[seed] demo content: ${D.categories.length} top-level categories, ${D.products.length} products, ${D.guides.length} guides, ${D.trends.length} trends, ${D.seasonal.length} seasonal pages`);
}

async function run() {
  await transaction(async (client) => {
    await seedAdmin(client);
    const { rows } = await client.query('select count(*)::int as n from categories');
    if (rows[0].n > 0) {
      console.log('[seed] content already exists — skipping demo content (npm run db:reset starts fresh)');
      return;
    }
    await seedContent(client);
    const { added } = await seedCatalog(client);
    console.log(`[seed] starter catalog: ${added} products`);
    // Content migrations ran before this content existed; apply them now.
    await giftGuide(client);
    console.log('[seed] gift guide applied');
  });
}

run()
  .catch((err) => {
    console.error('[seed] failed:', err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
