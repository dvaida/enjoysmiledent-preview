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

// The output folder _build/<outName>, refused unless strictly inside _build/. Pure: touches nothing.
export function outputDirOf(outName) {
  const out = path.resolve(BUILD, outName);
  if (!out.startsWith(`${BUILD}${path.sep}`)) throw new Error(`output folder ${out} is outside ${BUILD}${path.sep}`);
  return out;
}

// Builds srcDir (with an optional overlay config, relative to srcDir) into a fresh _build/<outName>.
// Jekyll's cleaner can leave stale files on the Docker mount (G-011), and the mount does not see a
// host-side delete in a folder it served before, so the build goes into a never-mounted folder that
// then replaces the old output.
export function buildInto(srcDir, outName, overlay) {
  const out = outputDirOf(outName);
  const fresh = outputDirOf(`.tmp-${path.basename(out)}-${process.pid}-${Date.now()}`);
  fs.mkdirSync(fresh, { recursive: true });
  const config = ['/src/_config.yml', ...(overlay ? [`/src/${overlay}`] : [])].join(',');
  console.log(`build ${outName}: ${srcDir} -> ${out} (config ${config})`);
  try {
    execFileSync('docker', [
      'run', '--rm', '-e', 'JEKYLL_ENV=production',
      '-v', `${srcDir}:/src:ro`, '-v', `${fresh}:/out`,
      IMAGE, 'build', '--source', '/src', '--destination', '/out', '--config', config,
    ], { stdio: 'inherit' });
  } catch (e) {
    fs.rmSync(fresh, { recursive: true, force: true });
    throw e;
  }
  fs.rmSync(out, { recursive: true, force: true });
  fs.renameSync(fresh, out);
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

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(BUILD, { recursive: true });
  for (const v of variants) buildInto(ROOT, v.name, v.overlay);
  if (process.env.BASELINE_REF) buildInto(baselineSource(process.env.BASELINE_REF), 'baseline', null);
}
