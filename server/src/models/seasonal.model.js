import { many, one, transaction } from '../config/db.js';
import { buildInsert, buildUpdate } from '../utils/sql.js';
import { savePinterest, pinterestFor, deletePinterest } from '../services/pinterest.service.js';

const WRITABLE = [
  'title', 'slug', 'eyebrow', 'hero_title', 'hero_subtitle', 'hero_image', 'season_start', 'season_end',
  'is_current', 'active', 'sort_order', 'seo',
];

export async function listSeasonalPages({ admin = false } = {}) {
  return many(`select s.*, (select count(*)::int from seasonal_sections x where x.page_id = s.id) as section_count
                 from seasonal_pages s ${admin ? '' : 'where s.active'}
                order by s.is_current desc, s.sort_order, s.season_start nulls last`);
}

export async function getSeasonalPage(by, value, { admin = false } = {}) {
  const col = by === 'slug' ? 'slug' : 'id';
  const page = await one(`select * from seasonal_pages where ${col} = $1 ${admin ? '' : 'and active'}`, [value]);
  if (!page) return null;
  const [sections, pinterest] = await Promise.all([
    many(`select * from seasonal_sections where page_id = $1 ${admin ? '' : 'and enabled'} order by sort_order, id`, [page.id]),
    pinterestFor('seasonal_page', page.id),
  ]);
  return { ...page, sections, pinterest };
}

export async function currentSeasonalPage() {
  return one(`select * from seasonal_pages where active and is_current limit 1`);
}

async function writeSections(client, pageId, sections) {
  if (!sections) return;
  await client.query('delete from seasonal_sections where page_id = $1', [pageId]);
  for (const [i, s] of sections.entries()) {
    await client.query(
      `insert into seasonal_sections (page_id, type, title, subtitle, config, sort_order, enabled)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [pageId, s.type, s.title ?? null, s.subtitle ?? null, JSON.stringify(s.config || {}), i, s.enabled !== false],
    );
  }
}

async function clearOtherCurrent(client, data, keepId) {
  if (data.is_current) await client.query('update seasonal_pages set is_current = false where is_current and id <> $1', [keepId ?? 0]);
}

export async function createSeasonalPage(data) {
  return transaction(async (client) => {
    await clearOtherCurrent(client, data);
    const ins = buildInsert('seasonal_pages', data, WRITABLE, ['seo']);
    const { rows } = await client.query(ins.text, ins.values);
    await writeSections(client, rows[0].id, data.sections);
    if (data.pinterest) await savePinterest(client, 'seasonal_page', rows[0].id, data.pinterest);
    return rows[0].id;
  });
}

export async function updateSeasonalPage(id, data) {
  return transaction(async (client) => {
    await clearOtherCurrent(client, data, id);
    const upd = buildUpdate('seasonal_pages', id, data, WRITABLE, ['seo']);
    if (upd && !(await client.query(upd.text, upd.values)).rowCount) return null;
    await writeSections(client, id, data.sections);
    if (data.pinterest) await savePinterest(client, 'seasonal_page', id, data.pinterest);
    return id;
  });
}

export async function deleteSeasonalPage(id) {
  return transaction(async (client) => {
    await deletePinterest(client, 'seasonal_page', id);
    return (await client.query('delete from seasonal_pages where id = $1', [id])).rowCount > 0;
  });
}
