// The price list lives at /tarife/; /servicii/ is a stub that forwards there (D-35, D-53).
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, variantOf, pagesOf, buildDirOf, filesUnder, FORWARDS } from './lib/site.mjs';

const SITE_URL = 'https://enjoysmiledent.ro';
const count = (html, re) => (html.match(re) ?? []).length;
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
const ROOT_ABSOLUTE = /(?:href|src|content)\s*=\s*["'](\/[^"']*)/g;

test('the /servicii/ stub forwards to /tarife/', async ({ request }, testInfo) => {
  const { name, baseurl } = variantOf(testInfo);
  const response = await request.get(`${baseurl}/servicii/`);
  expect(response.status(), 'status').toBe(200);
  const html = await response.text();
  const tarife = `${baseurl}/tarife/`;

  expect.soft(count(html, /http-equiv="refresh"/g), 'refresh metas').toBe(1);
  expect.soft(count(html, new RegExp(`<meta http-equiv="refresh" content="0; url=${esc(tarife)}">`, 'g')), 'refresh to tarife').toBe(1);
  expect.soft(count(html, /rel="canonical"/g), 'canonicals').toBe(1);
  expect.soft(count(html, new RegExp(`<link rel="canonical" href="${esc(SITE_URL + tarife)}">`, 'g')), 'canonical to tarife').toBe(1);
  expect.soft(html, 'title').toMatch(/<title>[^<]+<\/title>/);
  expect.soft(html, 'link to tarife').toContain(`<a href="${tarife}">`);
  expect.soft(count(html, /<meta name="robots" content="noindex, nofollow">/g), 'robots noindex')
    .toBe(name === 'preview' ? 1 : 0);
  const escaping = [...html.matchAll(ROOT_ABSOLUTE)].map((m) => m[1]).filter((u) => !u.startsWith(`${baseurl}/`));
  expect.soft(escaping, 'root-absolute URLs outside the prefix').toEqual([]);
});

test('/servicii without the slash answers 301 to /servicii/', async ({ request }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  const response = await request.get(`${baseurl}/servicii`, { maxRedirects: 0 });
  expect(response.status(), 'status').toBe(301);
  expect(response.headers().location, 'location').toBe(`${baseurl}/servicii/`);
});

test('a visitor of /servicii/ lands on the price list at /tarife/', async ({ page, baseURL }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  const root = new URL(`${baseurl}/`, baseURL).href;
  await page.goto(`${baseurl}/servicii/`);
  await page.waitForURL(`${root}tarife/`);

  expect.soft(await page.locator('.pages-title span').textContent(), 'banner heading').toBe('Tarife');
  const crumb = page.locator('.pages-title p a').nth(1);
  expect.soft(await crumb.textContent(), 'second crumb label').toBe('Tarife');
  expect.soft(await crumb.evaluate((a) => a.href), 'second crumb target').toBe(`${root}tarife/`);
  expect.soft(await page.locator('.shadow-pricing-table').count(), 'price tables').toBe(11);
});

test('the sitemap lists /tarife/ and not /servicii/', async ({ request }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  const xml = await (await request.get(`${baseurl}/sitemap.xml`)).text();
  expect.soft(xml, 'tarife').toContain(`<loc>${SITE_URL}${baseurl}/tarife/</loc>`);
  expect.soft(xml, 'servicii').not.toContain(`<loc>${SITE_URL}${baseurl}/servicii/</loc>`);
});

test('the built pages carrying a refresh are exactly FORWARDS, and pagesOf lists none of them', ({}, testInfo) => {
  const variant = variantOf(testInfo);
  const dir = buildDirOf(variant);
  const refreshing = filesUnder(dir)
    .filter((f) => f.endsWith('.html'))
    .filter((f) => fs.readFileSync(path.join(dir, f), 'utf8').includes('http-equiv="refresh"'))
    .map((f) => `/${f.replace(/(^|\/)index\.html$/, '$1')}`);
  expect.soft(refreshing, 'pages with a refresh').toEqual(FORWARDS);
  const listed = pagesOf(variant);
  expect.soft(FORWARDS.filter((p) => listed.includes(p)), 'forwards listed by pagesOf').toEqual([]);
});
