// The tagline front matter of the home and the five sub-pages reads exactly the agreed site name.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TAGLINE = 'Enjoy Smile Dent Florești - Cabinet Stomatologie Generală';
const FILES = ['index.html', 'blog/index.html', 'contact/index.html', 'foto/index.html', 'medici/index.html', 'servicii/index.html'];

for (const file of FILES) {
  test(`${file} has the agreed tagline`, () => {
    const text = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const lines = text.split('\n').filter((l) => l.startsWith('tagline:'));
    expect(lines).toEqual([`tagline: ${TAGLINE}`]);
  });
}
