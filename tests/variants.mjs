// Every site variant the harness builds into _build/<name> and serves under <baseurl>/.
// Feature lanes only append entries.
export const variants = [
  { name: 'prod', baseurl: '', overlay: null },
  { name: 'preview', baseurl: '/enjoysmiledent-preview', overlay: 'tests/preview.config.yml' },
];
