// Builds every variant with the GitHub Pages Docker image into _build/<name>.
// With BASELINE_REF set, also builds that commit into _build/baseline.
// Paths resolve from this file, so the script works from any working directory.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { variants } from './variants.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = path.join(ROOT, '_build');
const IMAGE = 'enjoysmile-jekyll:gh232';

function jekyll(srcDir, outName, overlay) {
  const out = path.join(BUILD, outName);
  fs.mkdirSync(out, { recursive: true });
  const config = ['/src/_config.yml', ...(overlay ? [`/src/${overlay}`] : [])].join(',');
  console.log(`build ${outName}: ${srcDir} -> ${out} (config ${config})`);
  execFileSync('docker', [
    'run', '--rm', '-e', 'JEKYLL_ENV=production',
    '-v', `${srcDir}:/src:ro`, '-v', `${out}:/out`,
    IMAGE, 'build', '--source', '/src', '--destination', '/out', '--config', config,
  ], { stdio: 'inherit' });
}

function baselineSource(ref) {
  const sha = execFileSync('git', ['-C', ROOT, 'rev-parse', '--verify', `${ref}^{commit}`]).toString().trim();
  const src = path.join(BUILD, `baseline-src-${sha}`);
  if (!fs.existsSync(src)) {
    const tar = path.join(BUILD, `baseline-${sha}.tar`);
    execFileSync('git', ['-C', ROOT, 'archive', '-o', tar, sha]);
    fs.mkdirSync(src);
    execFileSync('tar', ['-xf', tar, '-C', src]);
  }
  return src;
}

fs.mkdirSync(BUILD, { recursive: true });
for (const v of variants) jekyll(ROOT, v.name, v.overlay);
if (process.env.BASELINE_REF) jekyll(baselineSource(process.env.BASELINE_REF), 'baseline', null);
