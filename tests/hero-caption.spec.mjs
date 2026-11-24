// Home hero: the caption of every slide is vertically centred on the line of the two arrows
// and lies between them.
import { test, expect, variantOf } from './lib/site.mjs';

for (const viewport of [{ width: 1920, height: 1000 }, { width: 1512, height: 860 }, { width: 1280, height: 760 }, { width: 1100, height: 800 }]) {
  test(`hero captions sit on the arrows' line at ${viewport.width} px`, async ({ page }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    await page.setViewportSize(viewport);
    await page.goto(`${baseurl}/`, { waitUntil: 'load' });
    const slides = await page.evaluate(() => {
      const middle = (el) => { const r = el.getBoundingClientRect(); return r.top + r.height / 2; };
      const items = [...document.querySelectorAll('#carouselExampleIndicators .carousel-item')];
      return items.map((item) => {
        // Show this slide alone, without the sliding transition.
        for (const other of items) other.className = other === item ? 'carousel-item active' : 'carousel-item';
        const caption = item.querySelector('.slider-caption');
        const prev = document.querySelector('.carousel-control-prev-icon');
        const next = document.querySelector('.carousel-control-next-icon');
        return {
          caption: middle(caption),
          prev: middle(prev),
          next: middle(next),
          captionLeft: caption.getBoundingClientRect().left,
          captionRight: caption.getBoundingClientRect().right,
          prevRight: prev.getBoundingClientRect().right,
          nextLeft: next.getBoundingClientRect().left,
        };
      });
    });
    expect(slides.length).toBe(3);
    slides.forEach((s, i) => {
      expect.soft(Math.abs(s.caption - s.prev), `slide ${i + 1}: caption middle ${s.caption} vs left arrow ${s.prev}`).toBeLessThanOrEqual(1);
      expect.soft(Math.abs(s.caption - s.next), `slide ${i + 1}: caption middle ${s.caption} vs right arrow ${s.next}`).toBeLessThanOrEqual(1);
      // The text lies between the two arrows, at least 10 px clear of each.
      expect.soft(s.captionLeft - s.prevRight, `slide ${i + 1}: gap between the left arrow and the text`).toBeGreaterThanOrEqual(10);
      expect.soft(s.nextLeft - s.captionRight, `slide ${i + 1}: gap between the text and the right arrow`).toBeGreaterThanOrEqual(10);
    });
  });
}
