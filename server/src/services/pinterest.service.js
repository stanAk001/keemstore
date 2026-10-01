import { one, many } from '../config/db.js';
import { env } from '../config/env.js';

/** Upsert Pinterest fields for one piece of content. `db` may be a transaction client. */
export async function savePinterest(db, entityType, entityId, fields) {
  if (!fields) return null;
  const f = {
    title: fields.title ?? null,
    description: fields.description ?? null,
    image_url: fields.image_url ?? null,
    destination_url: fields.destination_url ?? null,
    board: fields.board ?? null,
    status: fields.status ?? 'draft',
  };
  const { rows } = await db.query(
    `insert into pinterest_metadata (entity_type, entity_id, title, description, image_url, destination_url, board, status, pinned_at)
     values ($1, $2, $3, $4, $5, $6, $7, $8, case when $8 = 'pinned' then now() end)
     on conflict (entity_type, entity_id) do update set
       title = excluded.title, description = excluded.description, image_url = excluded.image_url,
       destination_url = excluded.destination_url, board = excluded.board, status = excluded.status,
       pinned_at = case when excluded.status = 'pinned' then coalesce(pinterest_metadata.pinned_at, now()) else null end
     returning *`,
    [entityType, entityId, f.title, f.description, f.image_url, f.destination_url, f.board, f.status],
  );
  return rows[0];
}

export async function deletePinterest(db, entityType, entityId) {
  await db.query('delete from pinterest_metadata where entity_type = $1 and entity_id = $2', [entityType, entityId]);
}

/**
 * Everything that can be pinned, with its Pinterest metadata (or null) joined
 * in, so the admin can see gaps at a glance.
 */
export async function listPinnableContent() {
  const rows = await many(`
    with content as (
      select 'guide' as entity_type, g.id as entity_id, g.title, '/guides/' || g.slug as path,
             g.hero_image as image, g.status, c.name as category
        from guides g left join categories c on c.id = g.primary_category_id
      union all
      select 'collection', id, title, '/collections/' || slug, image_url,
             case when active then 'published' else 'inactive' end, null from collections
      union all
      select 'trend', t.id, t.title, '/trending/' || t.slug, t.image_url,
             case when t.active then 'published' else 'inactive' end, c.name
        from trends t left join categories c on c.id = t.category_id
      union all
      select 'seasonal_page', id, title, '/seasonal/' || slug, hero_image,
             case when active then 'published' else 'inactive' end, null from seasonal_pages
      union all
      select 'category', c.id, c.name,
             case when p.slug is null then '/' || c.slug else '/' || p.slug || '/' || c.slug end,
             c.image_url, case when c.active then 'published' else 'inactive' end, p.name
        from categories c left join categories p on p.id = c.parent_id
    )
    select content.*, pm.id as pin_id, pm.title as pin_title, pm.description as pin_description,
           pm.image_url as pin_image, pm.destination_url as pin_destination, pm.board as pin_board,
           pm.status as pin_status, pm.pinned_at
      from content
      left join pinterest_metadata pm
        on pm.entity_type = content.entity_type and pm.entity_id = content.entity_id
     order by content.entity_type, content.title`);
  return rows.map((r) => ({
    ...r,
    url: `${env.clientUrl}${r.path}`,
    pin_destination: r.pin_destination || `${env.clientUrl}${r.path}`,
  }));
}

export async function pinterestFor(entityType, entityId) {
  return one('select * from pinterest_metadata where entity_type = $1 and entity_id = $2', [entityType, entityId]);
}
