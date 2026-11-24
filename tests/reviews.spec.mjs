// The "Recenzii Google" section of the home page, fed by _data/google_reviews.yml.
// Fixture variants (tests/variants.mjs) build the same source with tests/fixtures/<name>/_data.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, variantOf, ROOT } from './lib/site.mjs';

// Reads the subset of YAML the review files use: top-level `key: value` scalars and a `reviews:` list of
// `author` / `rating` scalars and `text: |-` literal blocks (6-space indent, strip chomping).
// No YAML parser is installed and none is added.
function readReviews(file) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  const scalar = (v) => v.trim().replace(/^"(.*)"$/, '$1');
  const data = { reviews: [] };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    let m;
    if ((m = line.match(/^([a-z_]+):\s*(.*)$/)) && m[1] !== 'reviews') data[m[1]] = scalar(m[2]);
    else if ((m = line.match(/^ {2}- author:\s*(.*)$/))) data.reviews.push({ author: scalar(m[1]) });
    else if ((m = line.match(/^ {4}rating:\s*(.*)$/))) data.reviews.at(-1).rating = Number(m[1]);
    else if (/^ {4}text: \|-$/.test(line)) {
      const block = [];
      while (i + 1 < lines.length && (lines[i + 1] === '' || lines[i + 1].startsWith('      '))) block.push(lines[++i].slice(6));
      while (block.length && block.at(-1) === '') block.pop();
      data.reviews.at(-1).text = block.join('\n');
    }
  }
  return data;
}

const FULL = readReviews(path.join(ROOT, 'tests', 'fixtures', 'reviews-full', '_data', 'google_reviews.yml'));
const EMPTY = readReviews(path.join(ROOT, 'tests', 'fixtures', 'reviews-empty', '_data', 'google_reviews.yml'));
// Read inside the tests that need it, so a missing file fails those tests only.
const shipped = () => readReviews(path.join(ROOT, '_data', 'google_reviews.yml'));

test('the parser reads the files the spec relies on', () => {
  const SHIPPED = shipped();
  expect(FULL.reviews.map((r) => r.rating)).toEqual([5, 4, 5]);
  expect(FULL.reviews[0].text).toContain('\n\n');
  expect(FULL.reviews[1].text).toContain('<b>x</b> & "q"');
  expect(EMPTY.reviews).toEqual([]);
  expect(SHIPPED.reviews).toHaveLength(5);
  expect(SHIPPED.reviews.every((r) => r.text && r.text.length > 50)).toBe(true);
});

async function cards(page) {
  return page.$$eval('#recenzii .gr-review', (els) => els.map((el) => {
    const t = el.querySelector('.gr-text');
    return {
      author: el.querySelector('.gr-author')?.textContent,
      filled: el.querySelectorAll('.gr-stars i.fas.fa-star:not(.gr-off)').length,
      stars: el.querySelectorAll('.gr-stars i.fas.fa-star').length,
      label: el.querySelector('.gr-stars')?.getAttribute('aria-label'),
      text: t?.textContent,
      textChildren: t?.children.length,
      whiteSpace: t && getComputedStyle(t).whiteSpace,
    };
  }));
}

async function link(page) {
  const a = page.locator('#recenzii a.btn.btn-custom');
  await expect(a).toHaveCount(1);
  await expect(a).toHaveText('Vezi toate recenziile pe Google');
  return { href: await a.getAttribute('href'), target: await a.getAttribute('target'), rel: await a.getAttribute('rel') };
}

async function noForbiddenElements(page) {
  await expect(page.locator('#recenzii').locator('time, script, iframe, img')).toHaveCount(0);
}

test.describe('fixture variants', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(testInfo.project.name !== 'prod', 'fixture pages are absolute paths; one project is enough');
  });

  test('full: summary, three cards, link, placement', async ({ page, siteLog }) => {
    await page.goto('/fixture-full/', { waitUntil: 'load' });
    const section = page.locator('#recenzii');
    await expect(section).toHaveCount(1);
    await expect(section).toHaveClass(/\bcontainer\b/);
    await expect(section).toHaveClass(/\bgoogle-reviews\b/);
    await expect(section.locator('.section-title h2')).toHaveText('Recenzii Google');

    const order = await page.evaluate(() => {
      const s = document.querySelector('#recenzii');
      const team = document.querySelector('.team-carousel');
      const news = [...document.querySelectorAll('h2')].find((h) => h.textContent.trim() === 'Ultimele articole');
      return {
        afterTeam: !!(team && (team.compareDocumentPosition(s) & Node.DOCUMENT_POSITION_FOLLOWING)),
        beforeNews: !!(news && (s.compareDocumentPosition(news) & Node.DOCUMENT_POSITION_FOLLOWING)),
      };
    });
    expect(order).toEqual({ afterTeam: true, beforeNews: true });

    const summary = section.locator('.gr-summary');
    await expect(summary).toContainText('4,9');
    await expect(summary).toContainText('57 de recenzii');

    const got = await cards(page);
    expect(got.map((c) => c.author)).toEqual(FULL.reviews.map((r) => r.author));
    expect(got.map((c) => c.filled)).toEqual([5, 4, 5]);
    expect(got.map((c) => c.stars)).toEqual([5, 5, 5]);
    expect(got.map((c) => c.label)).toEqual(['5 din 5 stele', '4 din 5 stele', '5 din 5 stele']);
    expect(got.map((c) => c.text)).toEqual(FULL.reviews.map((r) => r.text));
    expect(got.map((c) => c.textChildren)).toEqual([0, 0, 0]);
    expect(got.map((c) => c.whiteSpace)).toEqual(['pre-line', 'pre-line', 'pre-line']);

    const filledColours = await page.$$eval('#recenzii .gr-review .gr-stars i:not(.gr-off)', (is) => [...new Set(is.map((i) => getComputedStyle(i).color))]);
    expect(filledColours).toEqual(['rgb(2, 181, 160)']);
    const offColours = await page.$$eval('#recenzii .gr-review .gr-stars i.gr-off', (is) => [...new Set(is.map((i) => getComputedStyle(i).color))]);
    expect(offColours).toEqual(['rgb(198, 199, 201)']);

    const l = await link(page);
    expect(l.href).toBe(FULL.reviews_url);
    expect(l.target).toBe('_blank');
    expect(l.rel.split(/\s+/)).toContain('noopener');
    await noForbiddenElements(page);
    expect(siteLog.failures).toEqual([]);
  });

  for (const [width, columns] of [[1280, '3'], [900, '2'], [400, '1']]) {
    test(`full: ${columns} column(s) at ${width} px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/fixture-full/', { waitUntil: 'load' });
      const count = await page.$eval('#recenzii .gr-list', (el) => getComputedStyle(el).columnCount);
      expect(count).toBe(columns);
    });
  }

  // The site styles every <footer> as the dark page footer (css/stylesheet.css, "7. FOOTER").
  test('full: the author line is plain text on the card, not a dark page-footer block', async ({ page }) => {
    await page.goto('/fixture-full/', { waitUntil: 'load' });
    const styles = await page.$$eval('#recenzii .gr-author', (els) => els.map((el) => {
      const s = getComputedStyle(el);
      return { background: s.backgroundColor, padding: s.padding, colour: s.color };
    }));
    expect(styles).toHaveLength(3);
    for (const s of styles) {
      expect(s.background).toBe('rgba(0, 0, 0, 0)');
      expect(s.padding).toBe('0px');
      expect(s.colour).toBe('rgb(53, 65, 75)');
    }
  });

  test('empty: section and link only', async ({ page }) => {
    await page.goto('/fixture-empty/', { waitUntil: 'load' });
    await expect(page.locator('#recenzii')).toHaveCount(1);
    await expect(page.locator('#recenzii .section-title h2')).toHaveText('Recenzii Google');
    await expect(page.locator('#recenzii .gr-summary, #recenzii .gr-list, #recenzii .gr-review')).toHaveCount(0);
    expect((await link(page)).href).toBe(EMPTY.reviews_url);
    await noForbiddenElements(page);
  });
});

test('home: the real reviews from _data/google_reviews.yml', async ({ page, siteLog }, testInfo) => {
  const SHIPPED = shipped();
  const { baseurl } = variantOf(testInfo);
  await page.goto(`${baseurl}/`, { waitUntil: 'load' });
  const summary = page.locator('#recenzii .gr-summary');
  await expect(summary).toContainText('5,0');
  await expect(summary).toContainText('53 de recenzii');

  const got = await cards(page);
  expect(got).toHaveLength(5);
  expect(got[0].author).toBe('Ioana N.');
  for (const c of got) expect(c.author).toMatch(/^\S+ \p{Lu}\.$/u);
  expect(got.map((c) => c.author)).toEqual(SHIPPED.reviews.map((r) => r.author));
  expect(got.map((c) => c.text)).toEqual(SHIPPED.reviews.map((r) => r.text));
  expect(got.map((c) => c.textChildren)).toEqual([0, 0, 0, 0, 0]);
  expect(new Set(got.map((c) => c.whiteSpace))).toEqual(new Set(['pre-line']));

  expect((await link(page)).href).toBe(SHIPPED.reviews_url);
  await noForbiddenElements(page);
  expect(siteLog.failures).toEqual([]);
});
