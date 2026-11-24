// Every page works under its variant's baseurl: nothing escapes to the site root.
import { test, expect, variantOf, pagesOf } from './lib/site.mjs';

// prod and preview build the same source, so the page list is the same for both projects.
const pages = pagesOf('prod');
// Posts colour text with [text](blue) / [text](red), styled by a[href='blue'|'red']: not links (G-012).
const NOT_LINKS = new Set(['blue', 'red']);
const ROOT_ABSOLUTE = /(?:href|src|action)\s*=\s*["'](\/[^"']*)|url\(\s*["']?(\/[^"')]*)|location\.href\s*=\s*["'](\/[^"']*)/g;

for (const p of pages) {
  test(`page ${p} stays inside the variant`, async ({ page, siteLog, request }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    const prefix = `${baseurl}/`;
    const url = `${baseurl}${p}`;
    await page.goto(url, { waitUntil: 'load' });

    const outside = siteLog.requests.filter((u) => !new URL(u).pathname.startsWith(prefix));
    expect.soft(outside, '(a) same-origin requests outside the prefix').toEqual([]);
    expect.soft(siteLog.failures, '(b) failed same-origin requests').toEqual([]);

    const html = await (await request.get(url)).text();
    const escaping = [...html.matchAll(ROOT_ABSOLUTE)]
      .map((m) => m[1] ?? m[2] ?? m[3])
      .filter((u) => !u.startsWith('//') && !u.startsWith(prefix));
    expect.soft(escaping, '(c) root-absolute URLs in the served HTML').toEqual([]);
  });
}

test('every same-origin link answers 200 inside the prefix', async ({ page, request, baseURL }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  const origin = new URL(baseURL).origin;
  const links = new Set();
  for (const p of pages) {
    await page.goto(`${baseurl}${p}`, { waitUntil: 'domcontentloaded' });
    const anchors = await page.$$eval('a[href]', (as) => as.map((a) => ({ attr: a.getAttribute('href'), href: a.href })));
    for (const { attr, href } of anchors) {
      if (NOT_LINKS.has(attr)) continue;
      const u = new URL(href);
      if (u.origin !== origin) continue;
      u.hash = '';
      links.add(u.href);
    }
  }
  const broken = [];
  for (const link of links) {
    const response = await request.get(link);
    const finalPath = new URL(response.url()).pathname;
    if (response.status() !== 200 || !finalPath.startsWith(`${baseurl}/`)) {
      broken.push(`${link} -> ${response.status()} ${finalPath}`);
    }
  }
  expect(broken, '(d) same-origin links not ending 200 inside the prefix').toEqual([]);
});
