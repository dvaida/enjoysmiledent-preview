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
