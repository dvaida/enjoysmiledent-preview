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
  h1: 'h1',
  heading: 'h1 img',
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

test('story: the h1 is the drawn heading with the real text for screen readers, below the fixed header', async ({ page }, testInfo) => {
  await openStory(page, testInfo, 1280);
  await expect(page.getByRole('heading', { level: 1, name: 'Povestea noastră' })).toHaveCount(1);
  expect(await page.$eval('h1', (h) => h.textContent.trim())).toBe('Povestea noastră');
  const img = page.locator('h1 img');
  await expect(img).toHaveCount(1);
  await expect(img).toBeVisible();
  expect(await naturalWidthOf(page, 'h1 img'), 'heading drawing loads').toBeGreaterThan(0);
  const b = await boxesOf(page);
  expect(b.h1.top, 'h1 top under the navbar').toBeGreaterThanOrEqual(b.navbar.bottom);
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
  const order = ['h1', 'text', 'photo', 'closing', 'logo'];
  for (let i = 1; i < order.length; i++) {
    expect(b[order[i]].top, `${order[i]} below ${order[i - 1]}`).toBeGreaterThanOrEqual(b[order[i - 1]].bottom);
  }

  const outside = await page.$$eval('section.story *', (els) => els
    .map((el) => [el, el.getBoundingClientRect()])
    .filter(([, r]) => r.width > 0 && (r.left < 0 || r.right > 400))
    .map(([el, r]) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')} ${r.left}-${r.right}`));
  expect(outside).toEqual([]);
});
