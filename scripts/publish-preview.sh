#!/usr/bin/env bash
# Publish the committed HEAD of the current branch to the preview repository.
# Dry-run by default; --apply pushes. Pushes three refs: a synthetic gh-pages commit (HEAD without
# CNAME, with baseurl and preview set in _config.yml), master, and the current branch.
# Never touches the working tree, the index, local refs or the git configuration.
set -euo pipefail

usage() {
  echo "usage: $0 [--apply]" >&2
  echo "  PREVIEW_REMOTE overrides the remote (default $DEFAULT_REMOTE)" >&2
  exit 2
}
fail() { echo "error: $*" >&2; exit 1; }

DEFAULT_REMOTE=https://github.com/dvaida/enjoysmiledent-preview.git
PREVIEW_BASEURL=/enjoysmiledent-preview
COMPARE_BASE=https://github.com/dvaida/enjoysmiledent-preview/compare/master...
SITE=https://dvaida.github.io/enjoysmiledent-preview/

apply=0
case $# in
  0) ;;
  1) [ "$1" = --apply ] || usage; apply=1 ;;
  *) usage ;;
esac

if [ "$apply" = 1 ]; then echo "mode: APPLY"; else echo "mode: DRY-RUN (pass --apply to execute)"; fi

remote=${PREVIEW_REMOTE:-$DEFAULT_REMOTE}
if [[ ${remote%/} =~ enjoysmiledent\.ro(\.git)?$ ]]; then
  fail "refusing the production repository as preview remote: $remote"
fi
branch=$(git symbolic-ref --quiet --short HEAD) || fail "detached HEAD: check out a branch first"
git rev-parse --verify --quiet refs/heads/master >/dev/null || fail "no local master branch"
head=$(git rev-parse HEAD)
short=$(git rev-parse --short HEAD)
message="Preview of $branch at $short"

refspecs=("+<gh-pages commit>:refs/heads/gh-pages" "refs/heads/master:refs/heads/master")
[ "$branch" = master ] || refspecs+=("HEAD:refs/heads/$branch")

echo "branch: $branch"
echo "HEAD:   $head"
echo "remote: $remote"
if [ -n "$(git --no-optional-locks status --porcelain)" ]; then
  echo "note: uncommitted changes are not published, only the committed HEAD"
fi
echo "gh-pages commit \"$message\" = HEAD with:"
echo "  - CNAME removed"
echo "  - _config.yml + 'baseurl: $PREVIEW_BASEURL' + 'preview: true'"
echo "push: git push \"$remote\"$(printf ' "%s"' "${refspecs[@]}")"

if [ "$apply" = 1 ]; then
  tmp=$(mktemp -d)
  cleanup() { rm -f "$tmp/index" "$tmp/_config.yml"; rmdir "$tmp"; }
  trap cleanup EXIT
  export GIT_INDEX_FILE="$tmp/index"
  git read-tree HEAD
  git rm --cached --quiet --ignore-unmatch CNAME
  git cat-file blob HEAD:_config.yml > "$tmp/_config.yml"
  if [ -n "$(tail -c 1 "$tmp/_config.yml")" ]; then echo >> "$tmp/_config.yml"; fi
  printf 'baseurl: %s\npreview: true\n' "$PREVIEW_BASEURL" >> "$tmp/_config.yml"
  blob=$(git hash-object -w --stdin < "$tmp/_config.yml")
  git update-index --cacheinfo "100644,$blob,_config.yml"
  tree=$(git write-tree)
  unset GIT_INDEX_FILE
  commit=$(git commit-tree "$tree" -p HEAD -m "$message")
  echo "gh-pages commit: $commit"
  refspecs[0]="+${commit}:refs/heads/gh-pages"
  git push "$remote" "${refspecs[@]}"
fi

echo "compare: ${COMPARE_BASE}${branch}  site: $SITE"
