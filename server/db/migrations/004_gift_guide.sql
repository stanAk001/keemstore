-- Gift guide support.
-- products.gift_note: a one-line, recipient-first note shown on gift pages
--   ("For the friend who…"); falls back to best_for when empty.
-- categories.layout: 'guide' renders a category as curated sections, one per
--   subcategory (e.g. Gifts → For Her, For Him…), instead of one long grid.
alter table products add column if not exists gift_note text;
-- products.gift_rank: position in the gift guide (1 leads); unranked picks follow.
alter table products add column if not exists gift_rank smallint;

alter table categories add column if not exists layout text not null default 'grid';
alter table categories drop constraint if exists categories_layout_check;
alter table categories add constraint categories_layout_check check (layout in ('grid', 'guide'));
