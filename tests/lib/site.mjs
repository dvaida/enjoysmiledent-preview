// Shared helpers for the specs. Imported by every lane, edited by none but base.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect } from '@playwright/test';
import { variants } from '../variants.mjs';

export { expect, variants };
export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
export const BUILD = path.join(ROOT, '_build');

const nameOf = (variant) => (typeof variant === 'string' ? variant : variant.name);
export const buildDirOf = (variant) => path.join(BUILD, nameOf(variant));

// The variant whose project runs this test (projects prod and preview).
export function variantOf(testInfo) {
  const v = variants.find((x) => x.name === testInfo.project.name);
  if (!v) throw new Error(`project "${testInfo.project.name}" is not a site variant`);
  return v;
}

// Every file under dir, relative, '/'-separated, sorted.
export function filesUnder(dir) {
  return fs.readdirSync(dir, { recursive: true })
    .map((f) => f.split(path.sep).join('/'))
    .filter((f) => fs.statSync(path.join(dir, f)).isFile())
    .sort();
}

// Every **/*.html of the built variant as a URL path relative to the variant root, with a leading
// slash: index.html -> '/', blog/index.html -> '/blog/', a/b.html -> '/a/b.html'. Prefix with
// variant.baseurl to navigate. prod and preview build the same source, so they list the same paths.
export function pagesOf(variant) {
  const dir = buildDirOf(variant);
  if (!fs.existsSync(dir)) throw new Error(`${dir} does not exist: run npm run build first`);
  return filesUnder(dir)
    .filter((f) => f.endsWith('.html'))
    .map((f) => `/${f.replace(/(^|\/)index\.html$/, '$1')}`);
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);

// `siteLog` records, for the test's browser context: same-origin request URLs, same-origin failures
// (network failure or status >= 400), attempted external URLs (all aborted) and page errors.
// `page` depends on it, so any test using `page` is hermetic: nothing outside localhost loads.
export const test = base.extend({
  siteLog: async ({ context, baseURL }, use) => {
    const origin = new URL(baseURL).origin;
    const sameOrigin = (url) => url.startsWith(`${origin}/`);
    const log = { requests: [], failures: [], external: [], pageErrors: [] };
    await context.route('**/*', (route) => {
      const url = route.request().url();
      let host = '';
      try { host = new URL(url).hostname; } catch {}
      if (LOCAL_HOSTS.has(host)) return route.continue();
      log.external.push(url);
      return route.abort('blockedbyclient');
    });
    context.on('request', (r) => { if (sameOrigin(r.url())) log.requests.push(r.url()); });
    context.on('requestfailed', (r) => {
      if (sameOrigin(r.url())) log.failures.push(`${r.url()} failed: ${r.failure()?.errorText}`);
    });
    context.on('response', (r) => {
      if (sameOrigin(r.url()) && r.status() >= 400) log.failures.push(`${r.url()} status ${r.status()}`);
    });
    await use(log);
  },
  page: async ({ page, siteLog }, use) => {
    page.on('pageerror', (e) => siteLog.pageErrors.push(String(e)));
    await use(page);
  },
});
