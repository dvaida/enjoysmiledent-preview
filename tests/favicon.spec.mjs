// The favicon is the brand symbol: 192x192 PNG, turquoise, no blue.
import { test, expect, variantOf } from './lib/site.mjs';
import { isBlue } from './lib/color.mjs';

const TURQ = [2, 181, 160];

test('the favicon is the 192 px turquoise brand symbol', async ({ page, request }, testInfo) => {
  const { baseurl } = variantOf(testInfo);
  await page.goto(`${baseurl}/`, { waitUntil: 'load' });
  const href = await page.locator('link[rel~="icon"]').first().evaluate((l) => l.href);

  const response = await request.get(href);
  expect(response.status()).toBe(200);
  expect(response.headers()['content-type']).toMatch(/^image\/png\b/);

  const { width, height, data } = await page.evaluate(async (src) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return { width: canvas.width, height: canvas.height,
      data: Array.from(ctx.getImageData(0, 0, canvas.width, canvas.height).data) };
  }, href);
  expect.soft([width, height]).toEqual([192, 192]);

  let opaque = 0;
  let turquoise = 0;
  const blue = [];
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = data.slice(i, i + 4);
    if (a !== 255) continue;
    opaque += 1;
    if (Math.hypot(r - TURQ[0], g - TURQ[1], b - TURQ[2]) <= 60) turquoise += 1;
    if (isBlue(r, g, b) && blue.length < 5) blue.push(`rgb(${r}, ${g}, ${b}) at ${(i / 4) % width},${Math.floor(i / 4 / width)}`);
  }
  expect(opaque).toBeGreaterThan(0);
  expect.soft(turquoise / opaque, 'share of opaque pixels near #02b5a0').toBeGreaterThanOrEqual(0.03);
  expect(blue, 'opaque blue pixels').toEqual([]);
});
