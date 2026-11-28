// The menu (D-33, D-34, D-35): POVESTEA NOASTRĂ opens the story, SERVICII drops down to the seven services and
// leads nowhere itself, TARIFE opens the price list. Hover and click wait for the loader; never forced.
import { test, expect, variantOf } from './lib/site.mjs';

const TOP = ['POVESTEA NOASTRĂ', 'SERVICII', 'TARIFE', 'MEDICI', 'FOTO', 'BLOG', 'CONTACT'];
const SERVICES = [
  ['Odontologie', 'odontologie'],
  ['Endodonție', 'endodontie'],
  ['Parodontologie', 'parodontologie'],
  ['Chirurgie dentară', 'chirurgie-dentara'],
  ['Protetică dentară', 'protetica-dentara'],
  ['Pedodonție', 'pedodontie'],
  ['Ortodonție', 'ortodontie'],
];
const ON = ['/', '/medici/'];

const rootOf = (baseURL, testInfo) => new URL(`${variantOf(testInfo).baseurl}/`, baseURL).href;

for (const p of ON) {
  test(`on ${p} at 1280 the menu has its seven entries and SERVICII drops down`, async ({ page, baseURL }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    const root = rootOf(baseURL, testInfo);
    await page.goto(`${baseurl}${p}`, { waitUntil: 'load' });

    const top = page.locator('.nav-menu > li > a');
    expect.soft(await top.evaluateAll((as) => as.map((a) => a.textContent.trim())), 'top labels').toEqual(TOP);
    const hrefs = await top.evaluateAll((as) => as.map((a) => a.href));
    expect.soft(hrefs[0], 'POVESTEA NOASTRĂ').toBe(`${root}povestea-noastra/`);
    expect.soft(await top.nth(1).getAttribute('href'), 'SERVICII href attribute').toBe('javascript:void(0)');
    expect.soft(hrefs.slice(2), 'TARIFE and the four others')
      .toEqual([`${root}tarife/`, `${root}medici`, `${root}foto`, `${root}blog`, `${root}contact`]);
    expect.soft(await page.locator('.nav-logo').evaluate((a) => a.href), 'logo').toBe(root);

    const servicii = top.nth(1);
    const chevron = page.locator('.nav-menu > li:nth-child(2) > a .submenu-indicator-chevron');
    expect.soft(await chevron.count(), 'chevron on SERVICII').toBe(1);
    const linkColour = await servicii.evaluate((a) => getComputedStyle(a).color);
    expect.soft(linkColour, 'SERVICII colour').toBe('rgb(204, 204, 204)');
    expect.soft(await chevron.evaluate((c) => getComputedStyle(c).borderRightColor), 'chevron colour').toBe(linkColour);

    const dropdown = page.locator('.nav-menu > li:nth-child(2) > ul.nav-dropdown');
    await expect(dropdown, 'dropdown at rest').toBeHidden();
    await servicii.hover();
    await expect(dropdown, 'dropdown on hover').toBeVisible();
    const items = dropdown.locator('a');
    expect.soft(await items.evaluateAll((as) => as.map((a) => a.textContent.trim())), 'dropdown labels')
      .toEqual(SERVICES.map(([label]) => label));
    expect.soft(await items.evaluateAll((as) => as.map((a) => a.href)), 'dropdown targets')
      .toEqual(SERVICES.map(([, slug]) => `${root}servicii/${slug}/`));
    const vp = page.viewportSize();
    for (let i = 0; i < SERVICES.length; i += 1) {
      const box = await items.nth(i).boundingBox();
      expect.soft(box && box.x >= 0 && box.y >= 0 && box.x + box.width <= vp.width && box.y + box.height <= vp.height,
        `${SERVICES[i][0]} inside the viewport: ${JSON.stringify(box)}`).toBe(true);
    }
    await page.mouse.move(640, 700);
    await expect(dropdown, 'dropdown after the mouse leaves').toBeHidden();

    const before = page.url();
    await servicii.click();
    await page.waitForTimeout(500);
    expect.soft(page.url(), 'URL after clicking SERVICII').toBe(before);
  });

  test(`on ${p} at 1280 the keyboard opens the dropdown`, async ({ page }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    await page.goto(`${baseurl}${p}`, { waitUntil: 'load' });
    const top = page.locator('.nav-menu > li > a');
    await top.first().focus();
    await page.keyboard.press('Tab');
    await expect(top.nth(1), 'SERVICII focused').toBeFocused();
    await expect(page.locator('.nav-menu > li:nth-child(2) > ul.nav-dropdown'), 'dropdown open').toBeVisible();
    await page.keyboard.press('Tab');
    await expect(page.locator('.nav-dropdown').getByRole('link', { name: 'Odontologie', exact: true }), 'Odontologie focused').toBeFocused();
  });

  test(`on ${p} the menu stays on one line from 993 px up`, async ({ page }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    for (const width of [993, 1024, 1199, 1280, 1920]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto(`${baseurl}${p}`, { waitUntil: 'load' });
      expect.soft(await page.locator('#navigation1').getAttribute('class'), `${width}: class`).toContain('navigation-landscape');
      const tops = await page.locator('.nav-menu > li').evaluateAll((ls) => ls.map((l) => Math.round(l.getBoundingClientRect().top)));
      expect.soft(tops.length, `${width}: top entries`).toBe(7);
      expect.soft(new Set(tops).size, `${width}: one top for all entries ${tops}`).toBe(1);
      const menu = await page.locator('.nav-menu').boundingBox();
      const logo = await page.locator('.nav-logo img').boundingBox();
      expect.soft(menu.x, `${width}: menu left >= logo right`).toBeGreaterThanOrEqual(logo.x + logo.width);
      expect.soft(menu.x + menu.width, `${width}: menu right <= viewport`).toBeLessThanOrEqual(width);
    }
    await page.setViewportSize({ width: 992, height: 800 });
    await page.goto(`${baseurl}${p}`, { waitUntil: 'load' });
    expect.soft(await page.locator('#navigation1').getAttribute('class'), '992: class').toContain('navigation-portrait');
  });

  test(`on ${p} at 400 the toggle opens the menu and SERVICII opens the seven services`, async ({ page, baseURL, siteLog }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    const root = rootOf(baseURL, testInfo);
    await page.setViewportSize({ width: 400, height: 800 });
    await page.goto(`${baseurl}${p}`, { waitUntil: 'load' });

    await page.locator('.nav-toggle').click();
    await expect(page.locator('.nav-menus-wrapper'), 'menu open').toHaveClass(/nav-menus-wrapper-open/);
    const dropdown = page.locator('.nav-menu > li:nth-child(2) > ul.nav-dropdown');
    await expect(dropdown, 'dropdown before SERVICII').toBeHidden();
    const before = page.url();
    await page.locator('.nav-menu > li > a').nth(1).click();
    await expect(dropdown, 'dropdown after SERVICII').toBeVisible();
    const items = dropdown.locator('a');
    expect.soft(await items.count(), 'items').toBe(7);
    for (let i = 0; i < 7; i += 1) await expect.soft(items.nth(i), `item ${i + 1}`).toBeVisible();
    expect.soft(page.url(), 'URL after clicking SERVICII').toBe(before);

    await items.filter({ hasText: 'Parodontologie' }).click();
    await page.waitForURL(`${root}servicii/parodontologie/`);
    expect.soft(await page.locator('h1').textContent(), 'h1').toBe('Parodontologie');
    expect.soft(siteLog.pageErrors, 'page errors').toEqual([]);
  });
}
