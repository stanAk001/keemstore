import { one } from '../config/db.js';
import { slugify, RESERVED_SLUGS } from './slug.js';
import { badRequest } from './httpError.js';

const TABLES = new Set(['products', 'categories', 'guides', 'trends', 'collections', 'seasonal_pages', 'pages']);

/**
 * Return a slug that is free in `table`. An explicitly supplied slug must be
 * free (we don't silently change what the editor typed); a generated one gets
 * a numeric suffix if needed.
 */
export async function resolveSlug(table, { slug, source, excludeId = null, reserved = false }) {
  if (!TABLES.has(table)) throw new Error(`resolveSlug: unknown table ${table}`);
  const explicit = Boolean(slug);
  const base = explicit ? slug : slugify(source);
  if (!base) throw badRequest('A title is required to generate a URL slug');
  if (reserved && RESERVED_SLUGS.has(base)) throw badRequest(`"${base}" is reserved by the site. Choose a different slug.`);

  const taken = async (s) => Boolean(await one(`select 1 from ${table} where slug = $1 and id is distinct from $2`, [s, excludeId]));
  if (!(await taken(base))) return base;
  if (explicit) throw badRequest(`The slug "${base}" is already used by another item`);
  for (let n = 2; n < 500; n++) {
    const candidate = `${base}-${n}`;
    if (!(await taken(candidate))) return candidate;
  }
  throw badRequest('Could not generate a unique slug');
}
