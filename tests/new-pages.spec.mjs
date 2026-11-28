// The story page and the seven service pages exist with the customer's texts (D-33, D-34, D-44).
import { test, expect, variantOf } from './lib/site.mjs';

const SITE_URL = 'https://enjoysmiledent.ro';

// path, h1, description (first sentence of the first paragraph), the one bold part.
const SERVICES = [
  ['/servicii/odontologie/', 'Odontologie',
    'Odontologia se ocupă cu prevenirea, diagnosticarea și tratarea afecțiunilor dinților, în special a cariilor dentare.',
    'prevenirea, diagnosticarea și tratarea afecțiunilor dinților, în special a cariilor dentare'],
  ['/servicii/endodontie/', 'Endodonție',
    'Endodonția este ramura stomatologiei care tratează afecțiunile pulpei dentare și infecțiile de la nivelul rădăcinii dintelui.',
    'tratează afecțiunile pulpei dentare și infecțiile de la nivelul rădăcinii dintelui.'],
  ['/servicii/parodontologie/', 'Parodontologie',
    'Parodontologia se ocupă cu diagnosticarea, prevenirea și tratarea afecțiunilor gingiilor și ale țesuturilor care susțin dinții.',
    'diagnosticarea, prevenirea și tratarea afecțiunilor gingiilor și ale țesuturilor care susțin dinții.'],
  ['/servicii/chirurgie-dentara/', 'Chirurgie dentară și implantologie',
    'Chirurgia dentară și implantologia reunesc proceduri care au ca scop tratarea afecțiunilor complexe ale cavității orale și refacerea dinților pierduți.',
    'tratarea afecțiunilor complexe ale cavității orale și refacerea dinților pierduți.'],
  ['/servicii/protetica-dentara/', 'Protetică dentară',
    'Protetica dentară are rolul de a reface forma, funcționalitatea și aspectul dinților afectați sau lipsă.',
    'a reface forma, funcționalitatea și aspectul dinților afectați sau lipsă.'],
  ['/servicii/pedodontie/', 'Pedodonție',
    'Pedodonția este specialitatea stomatologică dedicată sănătății orale a copiilor, de la apariția primilor dinți până la adolescență.',
    'dedicată sănătății orale a copiilor, de la apariția primilor dinți până la adolescență.'],
  ['/servicii/ortodontie/', 'Ortodonție',
    'Ortodonția se ocupă cu diagnosticarea și corectarea poziției dinților și a relațiilor dintre arcadele dentare.',
    'diagnosticarea și corectarea poziției dinților și a relațiilor dintre arcadele dentare.'],
];
const STORY = ['/povestea-noastra/', 'Povestea noastră',
  'Povestea noastră a început acum 21 de ani, într-un cabinet din Huedin.', 'acum 21 de ani'];
const STORY_CLOSING = 'După 21 de ani, rămânem fideli aceleiași idei de la care am pornit: să oferim tratamente de '
  + 'calitate, cu seriozitate, atenție și respect pentru fiecare om care ne trece pragul.';
const PAGES = [...SERVICES, STORY];
const CEDILLA = /[şţŞŢ]/g;

for (const [p, heading, description, bold] of PAGES) {
  const isStory = p === STORY[0];
  const text = isStory ? '.story-text' : '.svc-text';

  test(`page ${p} shows its heading and its text`, async ({ page }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    const response = await page.goto(`${baseurl}${p}`, { waitUntil: 'domcontentloaded' });
    expect(response.status(), 'status').toBe(200);

    const h1s = await page.$$eval('h1', (hs) => hs.map((h) => h.textContent.trim()));
    expect.soft(h1s, 'h1').toEqual([heading]);
    expect.soft(await page.locator(`${text} > p`).count(), `${text} > p`).toBe(isStory ? 5 : 2);
    if (isStory) {
      const closing = await page.$$eval('p.story-closing', (ps) => ps.map((x) => x.textContent.trim()));
      expect.soft(closing, 'p.story-closing').toEqual([STORY_CLOSING]);
    }
    const meta = await page.$eval('meta[name="description"]', (m) => m.getAttribute('content'));
    expect.soft(meta, 'meta description').toBe(description);
    const first = await page.locator(`${text} > p`).first().textContent();
    expect.soft(first.trim().startsWith(meta), `first paragraph starts with the description: ${first}`).toBe(true);
    const strongs = await page.$$eval(`${text} strong`, (ss) => ss.map((s) => s.textContent));
    expect.soft(strongs, `${text} strong`).toEqual([bold]);
  });

  test(`page ${p} has no cedilla letters`, async ({ request }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    const response = await request.get(`${baseurl}${p}`);
    expect(response.status(), 'status').toBe(200);
    expect((await response.text()).match(CEDILLA), 'ş ţ Ş Ţ in the HTML').toBeNull();
  });
}

test('the sitemap lists the eight new pages', async ({ request }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  const xml = await (await request.get(`${baseurl}/sitemap.xml`)).text();
  for (const [p] of PAGES) {
    expect.soft(xml, p).toContain(`<loc>${SITE_URL}${baseurl}${p}</loc>`);
  }
});
