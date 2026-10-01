import { many, one, transaction } from '../config/db.js';
import { buildInsert, buildUpdate } from '../utils/sql.js';
import { getProductsByIds } from './product.model.js';
import { savePinterest, pinterestFor, deletePinterest } from '../services/pinterest.service.js';

const WRITABLE = ['title', 'slug', 'description', 'image_url', 'seo', 'featured', 'active'];

export async function listCollections({ admin = false } = {}) {
  return many(`select c.*, (select count(*)::int from collection_products cp where cp.collection_id = c.id) as product_count
                 from collections c ${admin ? '' : 'where c.active'} order by c.featured desc, c.title`);
}

export async function getCollection(by, value, { admin = false } = {}) {
  const col = by === 'slug' ? 'slug' : 'id';
  const collection = await one(`select * from collections where ${col} = $1 ${admin ? '' : 'and active'}`, [value]);
  if (!collection) return null;
  const ids = (await many('select product_id from collection_products where collection_id = $1 order by position', [collection.id]))
    .map((r) => r.product_id);
  const [products, pinterest] = await Promise.all([
    getProductsByIds(ids, { admin, activeOnly: !admin }),
    pinterestFor('collection', collection.id),
  ]);
  return { ...collection, product_ids: ids, products, pinterest };
}

async function writeProducts(client, id, productIds) {
  if (!productIds) return;
  await client.query('delete from collection_products where collection_id = $1', [id]);
  for (const [i, pid] of [...new Set(productIds)].entries()) {
    await client.query('insert into collection_products (collection_id, product_id, position) values ($1, $2, $3)', [id, pid, i]);
  }
}

export async function createCollection(data) {
  return transaction(async (client) => {
    const ins = buildInsert('collections', data, WRITABLE, ['seo']);
    const { rows } = await client.query(ins.text, ins.values);
    await writeProducts(client, rows[0].id, data.product_ids);
    if (data.pinterest) await savePinterest(client, 'collection', rows[0].id, data.pinterest);
    return rows[0].id;
  });
}

export async function updateCollection(id, data) {
  return transaction(async (client) => {
    const upd = buildUpdate('collections', id, data, WRITABLE, ['seo']);
    if (upd && !(await client.query(upd.text, upd.values)).rowCount) return null;
    await writeProducts(client, id, data.product_ids);
    if (data.pinterest) await savePinterest(client, 'collection', id, data.pinterest);
    return id;
  });
}

export async function deleteCollection(id) {
  return transaction(async (client) => {
    await deletePinterest(client, 'collection', id);
    return (await client.query('delete from collections where id = $1', [id])).rowCount > 0;
  });
}
