// scripts/publish-preview.sh against throwaway repositories under os.tmpdir(): dry-run by default,
// publishes three refs with --apply, never touches the repository it runs in.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { ROOT } from './lib/site.mjs';

const SCRIPT = path.join(ROOT, 'scripts', 'publish-preview.sh');
const DRY = 'mode: DRY-RUN (pass --apply to execute)';
const SITE = 'https://dvaida.github.io/enjoysmiledent-preview/';
const compareOf = (branch) => `https://github.com/dvaida/enjoysmiledent-preview/compare/master...${branch}`;

// Hermetic git: no user or system config, identity only from the environment, no transport but file.
const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: '/dev/null',
  GIT_CONFIG_NOSYSTEM: '1',
  GIT_ALLOW_PROTOCOL: 'file',
  GIT_AUTHOR_NAME: 'Test Author',
  GIT_AUTHOR_EMAIL: 'author@example.test',
  GIT_COMMITTER_NAME: 'Test Committer',
  GIT_COMMITTER_EMAIL: 'committer@example.test',
};
delete ENV.PREVIEW_REMOTE;

const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, ...args], { env: ENV, encoding: 'utf8' }).trim();

// A work repo with CNAME, _config.yml (no trailing newline), index.html on master; branch `feat` one
// commit ahead and checked out, index.html modified but not committed. A bare remote whose only ref
// is an unrelated gh-pages commit.
function fixture({ branch = 'feat' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-preview-'));
  const work = path.join(dir, 'work');
  const remote = path.join(dir, 'remote.git');
  fs.mkdirSync(work);
  git(work, 'init', '-q', '-b', 'master');
  fs.writeFileSync(path.join(work, 'CNAME'), 'enjoysmiledent.ro\n');
  fs.writeFileSync(path.join(work, '_config.yml'), 'title: fixture\nbaseurl: ""');
  fs.writeFileSync(path.join(work, 'index.html'), '<p>home</p>\n');
  git(work, 'add', '-A');
  git(work, 'commit', '-q', '-m', 'Initial');
  if (branch !== 'master') {
    git(work, 'checkout', '-q', '-b', branch);
    fs.writeFileSync(path.join(work, 'feature.html'), '<p>feature</p>\n');
    git(work, 'add', 'feature.html');
    git(work, 'commit', '-q', '-m', 'Feature');
  }
  fs.writeFileSync(path.join(work, 'index.html'), '<p>uncommitted</p>\n');

  git(dir, 'init', '-q', '--bare', remote);
  const emptyTree = git(remote, 'hash-object', '-t', 'tree', '-w', '/dev/null');
  const probe = git(remote, 'commit-tree', emptyTree, '-m', 'Unrelated probe');
  git(remote, 'update-ref', 'refs/heads/gh-pages', probe);
  return { work, remote, branch };
}

function run(fx, args, remote = fx.remote) {
  const r = spawnSync(SCRIPT, args, { cwd: fx.work, env: { ...ENV, PREVIEW_REMOTE: remote }, encoding: 'utf8' });
  const lines = r.stdout.split('\n').filter((l) => l !== '');
  return { status: r.status, stdout: r.stdout, stderr: r.stderr, first: lines[0], last: lines.at(-1) };
}

const refsOf = (repo) => git(repo, 'for-each-ref', '--format=%(refname) %(objectname)');
const objectsOf = (repo) => git(repo, 'count-objects', '-v');
const localState = (fx) => ({
  refs: refsOf(fx.work),
  status: git(fx.work, 'status', '--porcelain'),
  index: git(fx.work, 'ls-files', '-s'),
  config: git(fx.work, 'config', '--local', '--list'),
  dirty: fs.readFileSync(path.join(fx.work, 'index.html'), 'utf8'),
});
const describe = (r) => `exit ${r.status}\nstdout:\n${r.stdout}\nstderr:\n${r.stderr}`;
const remoteRef = (fx, ref) => git(fx.remote, 'rev-parse', `refs/heads/${ref}`);
const treeOf = (repo, rev) => git(repo, 'ls-tree', '-r', rev).split('\n');

test('(1, 3) no flag: dry-run, nothing created, nothing pushed, the work repo unchanged', () => {
  const fx = fixture();
  const before = { remote: refsOf(fx.remote), objects: objectsOf(fx.work), local: localState(fx) };

  const r = run(fx, []);

  expect(r.status, describe(r)).toBe(0);
  expect(r.first, describe(r)).toBe(DRY);
  expect(r.last, describe(r)).toContain(compareOf('feat'));
  expect(r.last, describe(r)).toContain(SITE);
  expect(refsOf(fx.remote), 'remote refs').toBe(before.remote);
  expect(objectsOf(fx.work), 'local object count').toBe(before.objects);
  expect(localState(fx), 'local refs, status, index, config, dirty file').toEqual(before.local);
});

test('(2, 3) --apply: gh-pages is HEAD plus the preview config without CNAME; master and the branch pushed', () => {
  const fx = fixture();
  const before = localState(fx);
  const head = git(fx.work, 'rev-parse', 'HEAD');
  const master = git(fx.work, 'rev-parse', 'refs/heads/master');

  const r = run(fx, ['--apply']);

  expect(r.status, describe(r)).toBe(0);
  expect(r.first, describe(r)).toBe('mode: APPLY');
  expect(r.last, describe(r)).toContain(compareOf('feat'));
  expect(r.last, describe(r)).toContain(SITE);

  expect(git(fx.remote, 'for-each-ref', '--format=%(refname)').split('\n').sort(), 'remote refs')
    .toEqual(['refs/heads/feat', 'refs/heads/gh-pages', 'refs/heads/master']);
  expect(remoteRef(fx, 'master'), 'remote master').toBe(master);
  expect(remoteRef(fx, 'feat'), 'remote feat').toBe(head);

  const pages = remoteRef(fx, 'gh-pages');
  expect(git(fx.remote, 'rev-parse', `${pages}^@`), 'gh-pages parents').toBe(head);
  expect(git(fx.remote, 'log', '-1', '--format=%B', pages), 'gh-pages message')
    .toBe(`Preview of feat at ${git(fx.work, 'rev-parse', '--short', 'HEAD')}`);
  const headConfig = git(fx.work, 'cat-file', 'blob', 'HEAD:_config.yml');
  const pagesConfig = execFileSync('git', ['-C', fx.remote, 'cat-file', 'blob', `${pages}:_config.yml`], { env: ENV, encoding: 'utf8' });
  expect(pagesConfig, 'gh-pages _config.yml').toBe(`${headConfig}\nbaseurl: /enjoysmiledent-preview\npreview: true\n`);
  const others = (lines) => lines.filter((l) => !/\t(CNAME|_config\.yml)$/.test(l));
  const pagesTree = treeOf(fx.remote, pages);
  expect(pagesTree.some((l) => l.endsWith('\tCNAME')), 'CNAME in gh-pages').toBe(false);
  expect(others(pagesTree), 'other paths of gh-pages').toEqual(others(treeOf(fx.work, 'HEAD')));

  expect(localState(fx), 'local refs, status, index, config, dirty file').toEqual(before);
});

test('(4) --apply twice succeeds', () => {
  const fx = fixture();
  const head = git(fx.work, 'rev-parse', 'HEAD');
  for (const n of [1, 2]) {
    const r = run(fx, ['--apply']);
    expect(r.status, `run ${n}: ${describe(r)}`).toBe(0);
    expect(git(fx.remote, 'rev-parse', `${remoteRef(fx, 'gh-pages')}^@`), `run ${n}: gh-pages parent`).toBe(head);
  }
});

test('(5) the production repository is refused, with or without .git', () => {
  for (const prod of ['https://github.com/dvaida/enjoysmiledent.ro.git', 'https://github.com/dvaida/enjoysmiledent.ro']) {
    const fx = fixture();
    const before = { remote: refsOf(fx.remote), objects: objectsOf(fx.work), local: localState(fx) };
    for (const args of [[], ['--apply']]) {
      const r = run(fx, args, prod);
      expect(r.status, `${prod} ${args}: ${describe(r)}`).toBe(1);
    }
    expect(refsOf(fx.remote), 'remote refs').toBe(before.remote);
    expect(objectsOf(fx.work), 'local object count').toBe(before.objects);
    expect(localState(fx)).toEqual(before.local);
  }
});

test('(6) an unknown argument prints usage and exits 2', () => {
  const fx = fixture();
  const before = refsOf(fx.remote);
  for (const args of [['--bogus'], ['--apply', '--bogus']]) {
    const r = run(fx, args);
    expect(r.status, `${args}: ${describe(r)}`).toBe(2);
    expect(`${r.stdout}${r.stderr}`, 'usage').toMatch(/usage/i);
  }
  expect(refsOf(fx.remote), 'remote refs').toBe(before);
});

test('(7) a detached HEAD is refused', () => {
  const fx = fixture();
  git(fx.work, 'checkout', '-q', '--detach');
  const before = refsOf(fx.remote);
  const r = run(fx, ['--apply']);
  expect(r.status, describe(r)).toBe(1);
  expect(refsOf(fx.remote), 'remote refs').toBe(before);
});

test('(8) a missing local master is refused before any push', () => {
  const fx = fixture();
  git(fx.work, 'branch', '-q', '-D', 'master');
  const before = refsOf(fx.remote);
  const r = run(fx, ['--apply']);
  expect(r.status, describe(r)).toBe(1);
  expect(refsOf(fx.remote), 'remote refs').toBe(before);
});

test('(9) on master only gh-pages and master are pushed', () => {
  const fx = fixture({ branch: 'master' });
  const r = run(fx, ['--apply']);
  expect(r.status, describe(r)).toBe(0);
  expect(r.last, describe(r)).toContain(compareOf('master'));
  expect(git(fx.remote, 'for-each-ref', '--format=%(refname)').split('\n').sort(), 'remote refs')
    .toEqual(['refs/heads/gh-pages', 'refs/heads/master']);
  expect(remoteRef(fx, 'master')).toBe(git(fx.work, 'rev-parse', 'HEAD'));
});
