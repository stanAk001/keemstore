// Unit tests for outbound link building — no database needed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyTracking, resolveOutbound, unwrapNetworkLink } from '../src/services/affiliate.service.js';

const amazon = { id: 1, slug: 'amazon', name: 'Amazon', active: true, base_domain: 'amazon.com', tracking_param: 'tag', tracking_id: 'mytag-20' };
const rakuten = {
  id: 2, slug: 'popsy', name: 'Popsy Clothing', network: 'Rakuten', active: true, base_domain: 'popsyclothing.co.uk',
  link_template: 'https://click.linksynergy.com/deeplink?id=PUBID&mid=54317&murl={url}',
};
const programs = new Map([[1, amazon], [2, rakuten]]);
const page = 'https://www.popsyclothing.co.uk/products/hidden-cat-scarf?variant=1';
const wrapped = `https://click.linksynergy.com/deeplink?id=PUBID&mid=54317&murl=${encodeURIComponent(page)}`;

test('store links are wrapped in the program link template, URL-encoded', () => {
  const out = applyTracking(page, rakuten);
  assert.equal(out, wrapped);
  assert.equal(new URL(out).searchParams.get('murl'), page);
});

test('already-wrapped network links are used exactly as pasted', () => {
  assert.equal(applyTracking(wrapped, rakuten), wrapped);
  assert.equal(unwrapNetworkLink(wrapped), page);
  assert.equal(unwrapNetworkLink(page), null);
});

test('links on other domains are never wrapped', () => {
  assert.equal(applyTracking('https://example.com/x', rakuten), 'https://example.com/x');
  assert.equal(applyTracking('https://popsyclothing.co.uk.evil.com/x', rakuten), 'https://popsyclothing.co.uk.evil.com/x');
});

test('Amazon tagging is unchanged', () => {
  assert.equal(applyTracking('https://www.amazon.com/dp/B000000000', amazon), 'https://www.amazon.com/dp/B000000000?tag=mytag-20');
  assert.equal(applyTracking('https://www.amazon.com/dp/B000000000?tag=other-20', amazon), 'https://www.amazon.com/dp/B000000000?tag=other-20');
});

test('products credit the right program and retailer', () => {
  const plain = resolveOutbound({ affiliate_url: page }, programs, {});
  assert.deepEqual([plain.url, plain.program_id, plain.retailer], [wrapped, 2, 'Popsy Clothing']);
  const pasted = resolveOutbound({ affiliate_url: wrapped }, programs, {});
  assert.deepEqual([pasted.url, pasted.program_id, pasted.retailer], [wrapped, 2, 'Popsy Clothing']);
  const amz = resolveOutbound({ asin: 'B000000000' }, programs, {});
  assert.equal(amz.url, 'https://www.amazon.com/dp/B000000000?tag=mytag-20');
});
