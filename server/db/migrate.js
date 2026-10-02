// Minimal forward-only migration runner.
//   node db/migrate.js          apply pending migrations
//   node db/migrate.js --reset  drop everything in `public` first (development only)
// Migrations are .sql files, or .js modules exporting `up(client)` for content
// changes that are easier to express in code. Both run in one transaction each.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { pool } from '../src/config/db.js';
import { env } from '../src/config/env.js';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

async function run() {
  if (process.argv.includes('--reset')) {
    if (env.isProd && !process.argv.includes('--force')) {
      throw new Error('Refusing to reset a production database without --force');
    }
    await pool.query('drop schema public cascade; create schema public;');
    console.log('[migrate] schema reset');
  }

  await pool.query(`create table if not exists schema_migrations (
    name text primary key, applied_at timestamptz not null default now())`);

  const applied = new Set((await pool.query('select name from schema_migrations')).rows.map((r) => r.name));
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith('.sql') || f.endsWith('.js')).sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const full = path.join(dir, file);
    const client = await pool.connect();
    try {
      await client.query('begin');
      if (file.endsWith('.js')) await (await import(pathToFileURL(full).href)).up(client);
      else await client.query(await fs.readFile(full, 'utf8'));
      await client.query('insert into schema_migrations (name) values ($1)', [file]);
      await client.query('commit');
      console.log(`[migrate] applied ${file}`);
    } catch (err) {
      await client.query('rollback');
      throw new Error(`Migration ${file} failed: ${err.message}`);
    } finally {
      client.release();
    }
  }
  console.log('[migrate] up to date');
}

run()
  .catch((err) => {
    console.error(err.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
