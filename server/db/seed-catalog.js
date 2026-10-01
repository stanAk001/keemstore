// Adds the starter catalog (db/seeds/catalog.js) to an existing database.
// Safe to re-run: products whose slug already exists are skipped, so your
// edits to any imported product are never overwritten.
//
//   npm run db:catalog
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { CATALOG } from './seeds/catalog.js';

const images = JSON.parse(fs.readFileSync(new URL('./seeds/catalog-images.json', import.meta.url), 'utf8'));

const slugify = (s) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

/** Insert missing catalog products using `client` (a pg client or pool). Returns counts. */
export async function seedCatalog(client) {
  const { rows: cats } = await client.query('select id, slug from categories');
  const catId = Object.fromEntries(cats.map((c) => [c.slug, c.id]));
  let added = 0;
  let skipped = 0;
  const now = new Date().toISOString();

  for (const [key, name, category, sub, price, tags, short, bestFor, notFor, pros, cons] of CATALOG) {
    const slug = slugify(name);
    if ((await client.query('select 1 from products where slug = $1', [slug])).rowCount) {
      skipped++;
      continue;
    }
    if (!catId[category]) throw new Error(`Unknown category "${category}" for ${name}`);
    const { rows } = await client.query(
      `insert into products (name, slug, short_description, description, category_id, subcategory_id, amazon_url,
                             current_price, price_display, price_source, price_checked_at, pros, cons, best_for, not_for,
                             tags, is_demo)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Estimate — not shown publicly', $10, $11, $12, $13, $14, $15, true)
       returning id`,
      [name, slug, short, `${short} ${bestFor}`, catId[category], sub ? catId[sub] : null,
        `https://www.amazon.com/s?k=${encodeURIComponent(name)}`, price, `$${Math.round(price)}`, now,
        JSON.stringify(pros), JSON.stringify(cons), bestFor, notFor, tags],
    );
    const img = images[key];
    if (img?.url) {
      await client.query('insert into product_images (product_id, url, alt, credit) values ($1, $2, $3, $4)',
        [rows[0].id, img.url, name, `Photo: ${img.credit} / Unsplash`]);
    }
    added++;
  }
  return { added, skipped };
}

// CLI: node db/seed-catalog.js
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { pool, transaction } = await import('../src/config/db.js');
  try {
    const { added, skipped } = await transaction((client) => seedCatalog(client));
    console.log(`[catalog] added ${added} products, skipped ${skipped} that already exist`);
  } catch (err) {
    console.error('[catalog] failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

