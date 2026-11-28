// The story page (mockup-1): its three drawings, cut from the mockup's own outlines.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, variantOf, buildDirOf } from './lib/site.mjs';

const TURQUOISE = '#02b5a0';
const LIGHT_GREY = '#c6c7c9';
const DARK_GREY = '#88898a';

const DRAWINGS = [
  { file: 'img/master/povestea-noastra.svg', fills: [TURQUOISE] },
  { file: 'img/master/dinte-ornament.svg', fills: [TURQUOISE, LIGHT_GREY, DARK_GREY] },
  { file: 'img/master/logo-color.svg', fills: [TURQUOISE, LIGHT_GREY, DARK_GREY] },
];

const svgTagOf = (text) => text.match(/<svg\b[^>]*>/)?.[0] ?? '';
const attrOf = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*"([^"]*)"`))?.[1];

for (const { file, fills } of DRAWINGS) {
  test(`drawing ${file} is a small self-contained outline SVG in the brand colours`, async ({}, testInfo) => {
    const full = path.join(buildDirOf(variantOf(testInfo)), file);
    expect(fs.existsSync(full), `${file} is published`).toBe(true);
    const text = fs.readFileSync(full, 'utf8');
    expect(fs.statSync(full).size).toBeLessThan(30 * 1024);

    const svg = svgTagOf(text);
    expect(attrOf(svg, 'viewBox')).toMatch(/^-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+$/);
    expect(Number(attrOf(svg, 'width'))).toBeGreaterThan(0);
    expect(Number(attrOf(svg, 'height'))).toBeGreaterThan(0);

    for (const banned of ['<image', '<use', 'xlink', '<text']) expect(text).not.toContain(banned);

    const used = [...text.matchAll(/\sfill\s*=\s*"([^"]*)"/g)].map((m) => m[1].toLowerCase());
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((f) => !fills.includes(f))).toEqual([]);
  });
}

// The page itself, laid out as mockup-1 inside the site's header and footer.
const STORY = '/povestea-noastra/';
const PARTS = {
  navbar: '#navbar',
  banner: 'div.sections',
  h1: 'h1',
  heading: '.story-title img',
  text: '.story-text',
  photo: 'img.story-photo',
  tooth: 'img.story-tooth',
  closing: 'p.story-closing',
  logo: 'img.story-logo',
};

// Viewport boxes (page scrolled to the top) of each PARTS selector's single match, null when it is missing.
async function boxesOf(page) {
  return page.evaluate((parts) => {
    const out = {};
    for (const [name, sel] of Object.entries(parts)) {
      const els = document.querySelectorAll(sel);
      if (els.length !== 1) { out[name] = null; continue; }
      const r = els[0].getBoundingClientRect();
      out[name] = { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    }
    return out;
  }, PARTS);
}

async function openStory(page, testInfo, width) {
  const { baseurl } = variantOf(testInfo);
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`${baseurl}${STORY}`, { waitUntil: 'load' });
}

const naturalWidthOf = (page, sel) => page.$eval(sel, (img) => img.naturalWidth);

// Owner, 2026-11-28 (D-63): the story page opens with the site's own photo banner, as every older page.
test('story: banner with title and breadcrumb, then the drawn heading as decoration', async ({ page, baseURL }, testInfo) => {
  await openStory(page, testInfo, 1280);
  const { baseurl } = variantOf(testInfo);
  const words = (t) => t.replace(/\s+/g, ' ').trim();
  await expect(page.locator('h1')).toHaveCount(1);
  expect(words(await page.locator('h1').textContent())).toBe('Enjoy Smile Dent Povestea noastră');
  expect(words(await page.locator('.sections .pages-title h1 span').textContent())).toBe('Povestea noastră');
  expect(await page.$eval('div.sections', (e) => getComputedStyle(e).backgroundImage), 'banner photo')
    .toBe('url("https://storage.googleapis.com/enjoysmiledent/307_h1080.jpg")');
  expect(await page.$eval('div.sections', (e) => getComputedStyle(e).backgroundPosition), 'faces at the top stay visible')
    .toBe('50% 0%');

  const crumbs = page.locator('.pages-title p');
  expect(words(await crumbs.textContent()), 'breadcrumb').toBe('Acasă > Povestea noastră');
  const links = crumbs.locator('a');
  await expect(links).toHaveCount(2);
  expect(await links.nth(0).evaluate((a) => a.href), 'Acasă target').toBe(new URL(`${baseurl}/`, baseURL).href);
  expect(await links.nth(1).evaluate((a) => a.href), 'own crumb target').toBe(new URL(`${baseurl}${STORY}`, baseURL).href);

  const img = page.locator('.story-title img');
  await expect(img).toHaveCount(1);
  await expect(img).toBeVisible();
  expect(await img.getAttribute('alt'), 'the drawing repeats the h1: decoration only').toBe('');
  expect(await naturalWidthOf(page, '.story-title img'), 'heading drawing loads').toBeGreaterThan(0);
  const b = await boxesOf(page);
  expect(b.banner.top, 'banner top').toBe(0);
  expect(b.banner.height, 'banner height').toBe(550);
  expect(b.h1.top, 'h1 top under the navbar').toBeGreaterThanOrEqual(b.navbar.bottom);
  expect(b.h1.bottom, 'h1 inside the banner').toBeLessThanOrEqual(b.banner.bottom);
  expect(b.heading.top, 'drawing under the banner').toBeGreaterThanOrEqual(b.banner.bottom);
});

test('story at 1280: text beside the portrait, tooth on its corner, closing line and logo centred below', async ({ page }, testInfo) => {
  await openStory(page, testInfo, 1280);
  const b = await boxesOf(page);
  for (const name of Object.keys(PARTS)) expect(b[name], `${PARTS[name]} exists once`).not.toBeNull();

  expect(b.text.right, 'text right of photo left').toBeLessThanOrEqual(b.photo.left);
  const ratio = b.photo.width / b.photo.height;
  expect(ratio, 'photo portrait ratio').toBeGreaterThanOrEqual(0.62);
  expect(ratio, 'photo portrait ratio').toBeLessThanOrEqual(0.63);

  const overlaps = b.tooth.left < b.photo.right && b.tooth.right > b.photo.left
    && b.tooth.top < b.photo.bottom && b.tooth.bottom > b.photo.top;
  expect(overlaps, 'tooth overlaps the photo').toBe(true);
  expect(b.tooth.left, 'tooth sticks out left of the photo').toBeLessThan(b.photo.left);

  const closing = page.locator('p.story-closing');
  await expect(closing).toHaveCSS('font-style', 'italic');
  await expect(closing).toHaveCSS('text-align', 'center');
  expect(b.closing.top, 'closing under the text').toBeGreaterThanOrEqual(b.text.bottom);
  expect(b.closing.top, 'closing under the photo').toBeGreaterThanOrEqual(b.photo.bottom);
  expect(b.closing.top, 'closing under the tooth').toBeGreaterThanOrEqual(b.tooth.bottom);

  expect(await naturalWidthOf(page, 'img.story-logo'), 'logo loads').toBeGreaterThan(0);
  expect(b.logo.top, 'logo under the closing line').toBeGreaterThanOrEqual(b.closing.bottom);
  const mid = await page.evaluate(() => document.documentElement.clientWidth / 2);
  expect(Math.abs((b.logo.left + b.logo.right) / 2 - mid), 'logo centred').toBeLessThanOrEqual(2);
});

test('story: the bold part of the first paragraph renders bold, as in the mockup', async ({ page }, testInfo) => {
  await openStory(page, testInfo, 1280);
  const weight = await page.$eval('.story-text strong', (s) => Number(getComputedStyle(s).fontWeight));
  expect(weight, 'font-weight of acum 21 de ani').toBeGreaterThanOrEqual(600);
});

test('story at 400: one column, in order, nothing outside the viewport', async ({ page }, testInfo) => {
  await openStory(page, testInfo, 400);
  const b = await boxesOf(page);
  for (const name of Object.keys(PARTS)) expect(b[name], `${PARTS[name]} exists once`).not.toBeNull();

  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);

  expect(b.h1.top, 'h1 top under the navbar').toBeGreaterThanOrEqual(b.navbar.bottom);
  const order = ['h1', 'heading', 'text', 'photo', 'closing', 'logo'];
  for (let i = 1; i < order.length; i++) {
    expect(b[order[i]].top, `${order[i]} below ${order[i - 1]}`).toBeGreaterThanOrEqual(b[order[i - 1]].bottom);
  }

  const outside = await page.$$eval('section.story *', (els) => els
    .map((el) => [el, el.getBoundingClientRect()])
    .filter(([, r]) => r.width > 0 && (r.left < 0 || r.right > 400))
    .map(([el, r]) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${r.left}-${r.right}`));
  expect(outside).toEqual([]);
});

// Owner, 2026-11-28: the drawn heading has the same white band above it (up to the banner) and below it
// (down to the top of the first line's capitals). The drawing is cropped to its ink, so its box is the ink.
for (const width of [1440, 1280, 1000, 992, 768, 400]) {
  test(`story at ${width}: the heading has the same white band above and below`, async ({ page }, testInfo) => {
    await openStory(page, testInfo, width);
    await page.evaluate(() => document.fonts.ready);
    const b = await boxesOf(page);
    const capTop = await page.$eval('.story-text p', (p) => {
      const range = document.createRange();
      range.setStart(p.firstChild, 0);
      range.setEnd(p.firstChild, 1);
      const line = range.getBoundingClientRect();
      const cs = getComputedStyle(p);
      const ctx = document.createElement('canvas').getContext('2d');
      ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
      const m = ctx.measureText(p.firstChild.textContent[0]);
      const baseline = line.top + (line.height - m.fontBoundingBoxAscent - m.fontBoundingBoxDescent) / 2 + m.fontBoundingBoxAscent;
      return baseline - m.actualBoundingBoxAscent;
    });
    const above = b.heading.top - b.banner.bottom;
    const below = capTop - b.heading.bottom;
    expect(above, 'band above the heading').toBeGreaterThanOrEqual(30);
    expect(Math.abs(above - below), `band above ${above} vs band below ${below}`).toBeLessThanOrEqual(2);
  });
}
