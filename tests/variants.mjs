// Every site variant the harness builds into _build/<name> and serves under <baseurl>/.
// Feature lanes only append entries.
export const variants = [
  { name: 'prod', baseurl: '', overlay: null },
  { name: 'preview', baseurl: '/enjoysmiledent-preview', overlay: 'tests/preview.config.yml' },
  { name: 'reviews-full', baseurl: '/fixture-full', overlay: 'tests/fixtures/reviews-full/config.yml' },
  { name: 'reviews-empty', baseurl: '/fixture-empty', overlay: 'tests/fixtures/reviews-empty/config.yml' },
];
