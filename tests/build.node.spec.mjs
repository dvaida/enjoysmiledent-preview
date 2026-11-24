// tests/build.mjs empties its own output folder before each build (G-011), and nothing outside _build/<name>.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { buildInto, outputDirOf } from './build.mjs';
import { ROOT, BUILD } from './lib/site.mjs';

test('a stale file planted in an output folder is gone after a build', () => {
  const out = path.join(BUILD, 'selftest-clean');
  fs.mkdirSync(path.join(out, '.git'), { recursive: true });
  fs.writeFileSync(path.join(out, 'zz-stale.txt'), 'stale\n');
  fs.writeFileSync(path.join(out, '.git', 'stale.txt'), 'stale\n'); // Jekyll's cleaner keeps .git: only emptying removes it

  buildInto(ROOT, 'selftest-clean', null);

  expect(fs.existsSync(path.join(out, 'zz-stale.txt')), 'zz-stale.txt survived').toBe(false);
  expect(fs.existsSync(path.join(out, '.git')), '.git/ survived').toBe(false);
  expect(fs.existsSync(path.join(out, 'index.html')), 'the build wrote index.html').toBe(true);
});

test('an output folder that is not strictly inside _build/ is refused', () => {
  for (const name of ['', '.', '..', '../tests', '/tmp/x', 'a/../..']) {
    expect(() => outputDirOf(name), `output name ${JSON.stringify(name)}`).toThrow(/outside/);
  }
  expect(outputDirOf('prod')).toBe(path.join(BUILD, 'prod'));
});
