import { many, one, query } from '../config/db.js';
import { buildInsert, buildUpdate } from '../utils/sql.js';

const WRITABLE = ['title', 'slug', 'summary', 'content', 'seo', 'active'];
const JSON_COLS = ['content', 'seo'];

export const listPages = ({ admin = false } = {}) =>
  many(`select id, title, slug, summary, active, updated_at from pages ${admin ? '' : 'where active'} order by title`);

export const getPage = (by, value, { admin = false } = {}) =>
  one(`select * from pages where ${by === 'slug' ? 'slug' : 'id'} = $1 ${admin ? '' : 'and active'}`, [value]);

export async function createPage(data) {
  const ins = buildInsert('pages', data, WRITABLE, JSON_COLS);
  return one(ins.text, ins.values);
}

export async function updatePage(id, data) {
  const upd = buildUpdate('pages', id, data, WRITABLE, JSON_COLS);
  return upd ? one(upd.text, upd.values) : getPage('id', id, { admin: true });
}

export async function deletePage(id) {
  return (await query('delete from pages where id = $1', [id])).rowCount > 0;
}
