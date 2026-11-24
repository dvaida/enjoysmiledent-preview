// Home hero: the caption of every slide is vertically centred on the line of the two arrows
// and lies between them.
import { test, expect, variantOf } from './lib/site.mjs';

// Phones and tablets show no arrows: the caption only has to stay inside the screen and the slide.
for (const viewport of [{ width: 390, height: 844 }, { width: 768, height: 1024 }]) {
  test(`hero captions fit the screen at ${viewport.width} px`, async ({ page }, testInfo) => {
    const { baseurl } = variantOf(testInfo);
    await page.setViewportSize(viewport);
    await page.goto(`${baseurl}/`, { waitUntil: 'load' });
    const state = await page.evaluate(() => {
      const items = [...document.querySelectorAll('#carouselExampleIndicators .carousel-item')];
      const slides = items.map((item) => {
        for (const other of items) other.className = other === item ? 'carousel-item active' : 'carousel-item';
        const c = item.querySelector('.slider-caption').getBoundingClientRect();
        const s = item.getBoundingClientRect();
        return { left: c.left, right: c.right, top: c.top, bottom: c.bottom, slideTop: s.top, slideBottom: s.bottom };
      });
      return {
        slides,
        arrowsShown: getComputedStyle(document.querySelector('.carousel-control-prev')).display !== 'none',
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        transform: getComputedStyle(document.querySelector('.slider-caption')).transform,
      };
    });
    expect(state.arrowsShown).toBe(false);
    expect(state.overflow, 'horizontal overflow of the page').toBeLessThanOrEqual(0);
    expect(state.transform, 'the desktop shift does not reach small screens').toBe('none');
    state.slides.forEach((s, i) => {
      expect.soft(s.left, `slide ${i + 1}: caption left edge`).toBeGreaterThanOrEqual(0);
      expect.soft(s.right, `slide ${i + 1}: caption right edge`).toBeLessThanOrEqual(viewport.width);
      expect.soft(s.top, `slide ${i + 1}: caption top inside the slide`).toBeGreaterThanOrEqual(s.slideTop);
      expect.soft(s.bottom, `slide ${i + 1}: caption bottom inside the slide`).toBeLessThanOrEqual(s.slideBottom);
    });
  });
}

for (const viewport of [{ width: 1920, height: 1000 }, { width: 1512, height: 860 }, { width: 1440, height: 800 }, { width: 1352, height: 760 }, { width: 1280, height: 760 }, { width: 1100, height: 800 }, { width: 1000, height: 700 }]) {
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
          headingLines: Math.round(caption.querySelector('h2').getBoundingClientRect().height
            / parseFloat(getComputedStyle(caption.querySelector('h2')).lineHeight)),
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
      // Each heading is written as two lines (one <br>); fitting it between the arrows must not add a third.
      expect.soft(s.headingLines, `slide ${i + 1}: heading lines`).toBe(2);
    });
  });
}
