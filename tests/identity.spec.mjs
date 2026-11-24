// Production output must be byte-identical to the BASELINE_REF build. No normalisation.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect, buildDirOf, filesUnder } from './lib/site.mjs';

test('_build/prod is byte-identical to _build/baseline', () => {
  const prod = buildDirOf('prod');
  const baseline = buildDirOf('baseline');
  const files = filesUnder(prod);
  expect(files, 'file lists of _build/prod and _build/baseline').toEqual(filesUnder(baseline));

  for (const f of files) {
    const a = fs.readFileSync(path.join(prod, f));
    const b = fs.readFileSync(path.join(baseline, f));
    if (a.equals(b)) continue;
    let offset = 0;
    while (offset < a.length && offset < b.length && a[offset] === b[offset]) offset++;
    const context = (buf) => JSON.stringify(buf.subarray(Math.max(0, offset - 40), offset + 40).toString('utf8'));
    throw new Error(`first differing file: ${f} at byte offset ${offset}\n  prod:     ${context(a)}\n  baseline: ${context(b)}`);
  }
});
