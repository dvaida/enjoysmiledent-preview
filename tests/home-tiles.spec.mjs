// The home page's service tiles (D-50): "Mai mult" opens the matching service page, or Tarife for the others.
import { test, expect, variantOf } from './lib/site.mjs';

// In tile order: the h4's first words, the "Mai mult" target.
const TILES = [
  ['Tratamente laser', 'tarife/'],
  ['Consultație', 'tarife/'],
  ['Sănătate orală', 'tarife/'],
  ['Albirea dinților', 'tarife/'],
  ['Odontoterapie', 'servicii/odontologie/'],
  ['Chirurgie dentară', 'servicii/chirurgie-dentara/'],
  ['Protetică dentară', 'servicii/protetica-dentara/'],
  ['Endodonție', 'servicii/endodontie/'],
  ['Pedodonție', 'servicii/pedodontie/'],
  ['Ortodonție', 'servicii/ortodontie/'],
];

test('each home service tile links to its service page or to Tarife', async ({ page, baseURL }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  const root = new URL(`${baseurl}/`, baseURL).href;
  await page.goto(`${baseurl}/`, { waitUntil: 'domcontentloaded' });

  const tiles = await page.locator('.service-box-alt').evaluateAll((bs) => bs.map((b) => ({
    h4: b.querySelector('h4')?.textContent ?? '',
    href: b.querySelector('h5 a')?.href ?? null,
  })));
  expect(tiles.length, 'tiles').toBe(TILES.length);
  TILES.forEach(([words, target], i) => {
    expect.soft(tiles[i].h4.startsWith(words), `tile ${i + 1} h4 "${tiles[i].h4}" starts with "${words}"`).toBe(true);
    expect.soft(tiles[i].href, `tile ${i + 1} (${words}) target`).toBe(`${root}${target}`);
  });
});

test('no link on the home page goes to the bare /servicii/ forward', async ({ page, baseURL }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  const root = new URL(`${baseurl}/`, baseURL).href;
  await page.goto(`${baseurl}/`, { waitUntil: 'domcontentloaded' });
  const hrefs = await page.$$eval('a[href]', (as) => as.map((a) => a.href));
  expect(hrefs.filter((h) => h === `${root}servicii` || h === `${root}servicii/`), 'links to /servicii').toEqual([]);
});
