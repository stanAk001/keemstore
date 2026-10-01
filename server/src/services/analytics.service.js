// First-party analytics. Everything here is counted from our own tables —
// no conversion or revenue figures, because we don't receive those from Amazon.
import { many, one, query } from '../config/db.js';
import { detectDevice, detectSource, truncate } from '../utils/request.js';

export const RANGES = { today: 'today', '7d': 7, '30d': 30, '90d': 90 };

function since(range) {
  if (range === 'today') return `date_trunc('day', now())`;
  const days = RANGES[range] || 30;
  return `now() - interval '${Number(days)} days'`;
}

export async function recordClick(body, req) {
  // Derive the category from the product so "clicks by category" always works.
  await query(
    `insert into affiliate_clicks (product_id, guide_id, category_id, affiliate_link_id, program_id,
                                   page_path, cta_location, device, referrer, source, session_id)
     select p.id, $2, coalesce($3, p.subcategory_id, p.category_id),
            (select id from affiliate_links where id = $4 and product_id = p.id),
            (select program_id from affiliate_links where id = $4 and product_id = p.id),
            $5, $6, $7, $8, $9, $10
       from products p where p.id = $1`,
    [
      body.product_id,
      body.guide_id ?? null,
      body.category_id ?? null,
      body.affiliate_link_id ?? null,
      truncate(body.page_path, 500),
      truncate(body.cta_location, 60),
      detectDevice(req.get('user-agent')),
      truncate(body.referrer, 500),
      detectSource(body.referrer, body.utm_source),
      truncate(body.session_id, 64),
    ],
  );
}

export async function recordEvent(body, req) {
  await query(
    `insert into analytics_events (event_type, entity_type, entity_id, path, query, referrer, source, device, session_id)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      body.event_type,
      truncate(body.entity_type, 40),
      body.entity_id ?? null,
      truncate(body.path, 500),
      body.query ? truncate(String(body.query).toLowerCase().trim(), 200) : null,
      truncate(body.referrer, 500),
      detectSource(body.referrer, body.utm_source),
      detectDevice(req.get('user-agent')),
      truncate(body.session_id, 64),
    ],
  );
}

export async function clickSummary(range = '30d') {
  const from = since(range);
  const [totals, overTime, products, guides, categories, ctas, sources, devices] = await Promise.all([
    one(`select count(*)::int as clicks, count(distinct session_id)::int as sessions,
                count(distinct product_id)::int as products
           from affiliate_clicks where created_at >= ${from}`),
    many(`select to_char(d, 'YYYY-MM-DD') as date, coalesce(c.clicks, 0)::int as clicks
            from generate_series(date_trunc('day', ${from}), date_trunc('day', now()), interval '1 day') d
            left join (select date_trunc('day', created_at) as day, count(*) as clicks
                         from affiliate_clicks where created_at >= ${from} group by 1) c on c.day = d
           order by d`),
    many(`select p.id, p.name, p.slug, count(*)::int as clicks
            from affiliate_clicks a join products p on p.id = a.product_id
           where a.created_at >= ${from} group by p.id order by clicks desc limit 10`),
    many(`select g.id, g.title, g.slug, count(*)::int as clicks
            from affiliate_clicks a join guides g on g.id = a.guide_id
           where a.created_at >= ${from} group by g.id order by clicks desc limit 10`),
    many(`select c.id, c.name, count(*)::int as clicks
            from affiliate_clicks a join categories c on c.id = a.category_id
           where a.created_at >= ${from} group by c.id order by clicks desc limit 10`),
    many(`select coalesce(cta_location, 'unknown') as cta, count(*)::int as clicks
            from affiliate_clicks where created_at >= ${from} group by 1 order by clicks desc limit 10`),
    many(`select coalesce(source, 'unknown') as source, count(*)::int as clicks
            from affiliate_clicks where created_at >= ${from} group by 1 order by clicks desc limit 8`),
    many(`select coalesce(device, 'unknown') as device, count(*)::int as clicks
            from affiliate_clicks where created_at >= ${from} group by 1 order by clicks desc`),
  ]);
  return { range, totals, overTime, products, guides, categories, ctas, sources, devices };
}

/** Which content is actually making people click products? */
export async function contentPerformance(range = '30d') {
  const from = since(range);
  const [guides, searches, trends, categories, views] = await Promise.all([
    many(`select g.id, g.title, g.slug, g.status,
                 coalesce(v.views, 0)::int as views, coalesce(c.clicks, 0)::int as clicks,
                 case when coalesce(v.views, 0) = 0 then null
                      else round(100.0 * coalesce(c.clicks, 0) / v.views, 1)::float end as click_rate
            from guides g
            left join (select entity_id, count(*) as views from analytics_events
                        where event_type = 'page_view' and entity_type = 'guide' and created_at >= ${from}
                        group by entity_id) v on v.entity_id = g.id
            left join (select guide_id, count(*) as clicks from affiliate_clicks
                        where created_at >= ${from} group by guide_id) c on c.guide_id = g.id
           where coalesce(v.views, 0) > 0 or coalesce(c.clicks, 0) > 0
           order by clicks desc, views desc limit 25`),
    many(`select query, count(*)::int as searches from analytics_events
           where event_type = 'search' and query is not null and created_at >= ${from}
           group by query order by searches desc limit 15`),
    many(`select t.id, t.title, count(*)::int as clicks from analytics_events e join trends t on t.id = e.entity_id
           where e.event_type = 'trend_click' and e.created_at >= ${from}
           group by t.id order by clicks desc limit 10`),
    many(`select c.id, c.name, count(*)::int as clicks from analytics_events e join categories c on c.id = e.entity_id
           where e.event_type = 'category_click' and e.created_at >= ${from}
           group by c.id order by clicks desc limit 10`),
    one(`select count(*)::int as page_views, count(distinct session_id)::int as sessions
           from analytics_events where event_type = 'page_view' and created_at >= ${from}`),
  ]);
  const sources = await many(`select coalesce(source, 'unknown') as source, count(*)::int as views
                                from analytics_events where event_type = 'page_view' and created_at >= ${from}
                               group by 1 order by views desc limit 8`);
  return { range, guides, searches, trends, categories, views, sources };
}

export async function dashboardOverview() {
  const [counts, clicks] = await Promise.all([
    one(`select (select count(*) from guides)::int as guides,
                (select count(*) from guides where status = 'published')::int as published_guides,
                (select count(*) from guides where status = 'draft')::int as draft_guides,
                (select count(*) from guides where status = 'scheduled')::int as scheduled_guides,
                (select count(*) from products)::int as products,
                (select count(*) from products where active)::int as active_products,
                (select count(*) from categories)::int as categories,
                (select count(*) from trends where active)::int as trends,
                (select count(*) from newsletter_subscribers where status = 'subscribed')::int as subscribers,
                (select count(*) from affiliate_clicks)::int as clicks_all_time,
                (select count(*) from affiliate_clicks where created_at >= now() - interval '7 days')::int as clicks_7d,
                (select count(*) from products p where p.active and p.amazon_url is null and p.affiliate_url is null
                   and p.asin is null and not exists (select 1 from affiliate_links l where l.product_id = p.id and l.active))::int
                  as products_missing_links`),
    clickSummary('30d'),
  ]);
  return { counts, clicks };
}
