// Titles and the home description (D-7, D-14, D-22): the same on every variant.
import { test, expect, variantOf, pagesOf } from './lib/site.mjs';

const pages = pagesOf('prod');
const SITE = 'Enjoy Smile Dent Florești - Cabinet Stomatologie Generală';
const HOME_DESCRIPTION = 'Consultație stomatologică, Control stomatologic, Sănătate orală, Albirea dinților, '
  + 'Odontoterapie, Endodonție, Protetică dentară, Implant dentar, Chirurgie dentară, Pedodonție, Ortodonție';
const SUB_PAGES = {
  '/servicii/': 'Servicii',
  '/medici/': 'Medici',
  '/foto/': 'Galerie Foto',
  '/blog/': 'Blog',
  '/contact/': 'Contact',
};
// The story page and the service pages (D-33, D-44): path -> [title name, description].
const NEW_PAGES = {
  '/povestea-noastra/': ['Povestea noastră',
    'Povestea noastră a început acum 21 de ani, într-un cabinet din Huedin.'],
  '/servicii/odontologie/': ['Odontologie',
    'Odontologia se ocupă cu prevenirea, diagnosticarea și tratarea afecțiunilor dinților, în special a cariilor dentare.'],
  '/servicii/endodontie/': ['Endodonție',
    'Endodonția este ramura stomatologiei care tratează afecțiunile pulpei dentare și infecțiile de la nivelul rădăcinii dintelui.'],
  '/servicii/parodontologie/': ['Parodontologie',
    'Parodontologia se ocupă cu diagnosticarea, prevenirea și tratarea afecțiunilor gingiilor și ale țesuturilor care susțin dinții.'],
  '/servicii/chirurgie-dentara/': ['Chirurgie dentară și implantologie',
    'Chirurgia dentară și implantologia reunesc proceduri care au ca scop tratarea afecțiunilor complexe ale cavității orale și refacerea dinților pierduți.'],
  '/servicii/protetica-dentara/': ['Protetică dentară',
    'Protetica dentară are rolul de a reface forma, funcționalitatea și aspectul dinților afectați sau lipsă.'],
  '/servicii/pedodontie/': ['Pedodonție',
    'Pedodonția este specialitatea stomatologică dedicată sănătății orale a copiilor, de la apariția primilor dinți până la adolescență.'],
  '/servicii/ortodontie/': ['Ortodonție',
    'Ortodonția se ocupă cu diagnosticarea și corectarea poziției dinților și a relațiilor dintre arcadele dentare.'],
};
const isPost = (p) => p.startsWith('/blog/') && p !== '/blog/';

test('the plan names pages that exist', () => {
  for (const p of ['/', ...Object.keys(SUB_PAGES), ...Object.keys(NEW_PAGES), '/blog/mentinerea-sanatatii-cavitatii-orale/']) {
    expect(pages, p).toContain(p);
  }
});

for (const p of pages) {
  test(`page ${p} has the agreed title`, async ({ page }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    await page.goto(`${baseurl}${p}`, { waitUntil: 'domcontentloaded' });
    const titles = await page.$$eval('title', (ts) => ts.map((t) => t.textContent));
    const meta = (sel) => page.$eval(sel, (m) => m.getAttribute('content')).catch(() => null);
    const ogTitle = await meta('meta[property="og:title"]');

    expect.soft(titles.length, 'number of <title>').toBe(1);
    expect.soft(await meta('meta[property="og:site_name"]'), 'og:site_name').toBe('enjoysmiledent.ro');

    if (p === '/') {
      expect.soft(titles[0], 'title').toBe(SITE);
      expect.soft(ogTitle, 'og:title').toBe(SITE);
      expect.soft(await meta('meta[name="description"]'), 'description').toBe(HOME_DESCRIPTION);
      expect.soft(await meta('meta[property="og:description"]'), 'og:description').toBe(HOME_DESCRIPTION);
    } else if (SUB_PAGES[p]) {
      expect.soft(titles[0], 'title').toBe(`${SUB_PAGES[p]} / ${SITE}`);
    } else if (NEW_PAGES[p]) {
      const [name, description] = NEW_PAGES[p];
      expect.soft(titles[0], 'title').toBe(`${name} / ${SITE}`);
      expect.soft(await meta('meta[name="description"]'), 'description').toBe(description);
      expect.soft(await meta('meta[property="og:description"]'), 'og:description').toBe(description);
    } else if (isPost(p)) {
      expect.soft(ogTitle, 'og:title').toBeTruthy();
      expect.soft(titles[0], 'title').toBe(`${ogTitle} | enjoysmiledent.ro`);
      if (p === '/blog/mentinerea-sanatatii-cavitatii-orale/') {
        expect.soft(titles[0], 'title').toBe('Mentinerea Sanatatii Cavitatii Orale | enjoysmiledent.ro');
      }
    } else {
      throw new Error(`page ${p} is not covered by the title rules`);
    }
  });
}
