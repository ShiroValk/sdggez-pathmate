/** Standalone equivalent of the non-platform CSS duplicate-property check. */
module.exports = {
  rules: { 'declaration-block-no-duplicate-custom-properties': true },
  ignoreFiles: [
    'node_modules/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'source_package/**',
    '*.min.css',
  ],
};
