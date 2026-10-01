-- Networks like Rakuten don't add a tag to the store URL; they wrap it in a
-- redirect, e.g. https://click.linksynergy.com/deeplink?id=...&mid=...&murl={url}
-- When set, {url} is replaced with the URL-encoded store link on every click.
alter table affiliate_programs add column link_template text;
