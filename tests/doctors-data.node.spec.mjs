// Each doctor's line under the name is written in one place only: _data/doctors.yml (brief §4.4).
// Walks the worktree's files on disk (not git ls-files: a new file is untracked until its commit).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SKIP = new Set(['.git', '_build', 'node_modules', 'tests', 'test-results', 'playwright-report']);
const READ = new Set(['.html', '.md', '.yml', '.yaml']);

// The "line under the name" column of texts.md's doctors table.
const LINES = [
  'Stomatologie Generală - Estetică Dentară - Protetică',
  'Stomatologie generală - Protetică',
  'Medic Specialist Ortodonție și Ortopedie Dento Facială',
  'Medic specialist pedodonție',
  'Medic specialist chirurgie dento-alveolară',
];

function sourceFiles(dir, rel = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const r = rel ? `${rel}/${e.name}` : e.name;
    if (e.isDirectory()) out.push(...sourceFiles(path.join(dir, e.name), r));
    else if (e.isFile() && READ.has(path.extname(e.name))) out.push(r);
  }
  return out;
}

function filesContaining(text) {
  return sourceFiles(ROOT).filter((f) => fs.readFileSync(path.join(ROOT, f), 'utf8').includes(text));
}

for (const line of LINES) {
  test(`"${line}" is written only in _data/doctors.yml`, () => {
    expect(filesContaining(line)).toEqual(['_data/doctors.yml']);
  });
}

// Brief §4.5: the two LinkedIn addresses, without any tracking tail, live in the data file only.
for (const address of [
  'https://www.linkedin.com/in/ancuta-marcu-a15189378',
  'https://www.linkedin.com/in/maria-cristescu-715160447',
]) {
  test(`${address} is written only in _data/doctors.yml`, () => {
    expect(filesContaining(address)).toEqual(['_data/doctors.yml']);
  });
}
