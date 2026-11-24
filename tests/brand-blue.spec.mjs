// No blue anywhere (D-15, D-23): blue became the brand turquoise #02b5a0, dark blue the slate #35414b.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, variantOf, pagesOf, buildDirOf, filesUnder } from './lib/site.mjs';
import { isBlue, parseColor, blueLiterals } from './lib/color.mjs';

const pages = pagesOf('prod');

const PROPS = ['color', 'background-color', 'border-top-color', 'border-right-color', 'border-bottom-color',
  'border-left-color', 'outline-color', 'fill', 'stroke', 'text-decoration-color', 'box-shadow', 'text-shadow',
  'background-image'];

// In the page: every rgb()/rgba() token of PROPS on every element and its rendered ::before/::after,
// as token -> up to 3 places ("div#x.a.b::before color"). Osano's widget is skipped.
function computedColors(props) {
  const seen = {};
  const describe = (el) => el.tagName.toLowerCase() + (el.id ? `#${el.id}` : '')
    + [...el.classList].slice(0, 3).map((c) => `.${c}`).join('');
  for (const el of document.querySelectorAll('*')) {
    if (el.closest('[class*="osano"]')) continue;
    for (const pseudo of [null, '::before', '::after']) {
      const cs = getComputedStyle(el, pseudo);
      if (pseudo && (cs.content === 'none' || cs.content === 'normal')) continue;
      for (const prop of props) {
        for (const token of cs.getPropertyValue(prop).match(/rgba?\([^)]*\)/g) ?? []) {
          const where = (seen[token] ??= []);
          if (where.length < 3) where.push(`${describe(el)}${pseudo ?? ''} ${prop}`);
        }
      }
    }
  }
  return seen;
}

for (const p of pages) {
  test(`(a) page ${p} renders no blue`, async ({ page }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    await page.goto(`${baseurl}${p}`, { waitUntil: 'load' });
    const colors = await page.evaluate(computedColors, PROPS);
    const blue = Object.entries(colors)
      .filter(([token]) => isBlue(...parseColor(token)))
      .map(([token, where]) => `${token} at ${where.join(', ')}`);
    expect(blue).toEqual([]);
  });
}

// The colour-bearing parts of an HTML file: style attributes, <style> blocks, fill/stroke/stop-color attributes.
const HTML_PARTS = /\sstyle\s*=\s*("[^"]*"|'[^']*')|<style\b[^>]*>([\s\S]*?)<\/style>|\s(?:fill|stroke|stop-color)\s*=\s*("[^"]*"|'[^']*')/gi;

test('(b) no blue literal in the published CSS, SVG and HTML', async ({}, testInfo) => {
  const dir = buildDirOf(variantOf(testInfo));
  const found = [];
  for (const f of filesUnder(dir)) {
    let text;
    if (/^css\/[^/]+\.css$/.test(f) && !/^css\/bootstrap/.test(f)) text = fs.readFileSync(path.join(dir, f), 'utf8');
    else if (/^img\/.*\.svg$/.test(f)) text = fs.readFileSync(path.join(dir, f), 'utf8');
    else if (f.endsWith('.html')) {
      text = [...fs.readFileSync(path.join(dir, f), 'utf8').matchAll(HTML_PARTS)]
        .map((m) => m[1] ?? m[2] ?? m[3]).join('\n');
    } else continue;
    const lits = blueLiterals(text);
    if (lits.length) found.push(`${f}: ${lits.length}x ${[...new Set(lits)].join(' ')}`);
  }
  expect(found).toEqual([]);
});

test('(c) the header bar is turquoise and the news titles slate', async ({ page }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  await page.goto(`${baseurl}/`, { waitUntil: 'load' });
  await expect(page.locator('.header-left').first()).toHaveCSS('background-color', 'rgb(2, 181, 160)');
  const h3 = page.locator('.ic-top h3');
  expect(await h3.count()).toBeGreaterThan(0);
  for (const color of await h3.evaluateAll((els) => els.map((e) => getComputedStyle(e).color))) {
    expect(color).toBe('rgb(53, 65, 75)');
  }
});
