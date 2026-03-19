const MR_SELECTORS = {
  title: '[data-testid="title-content"]',
  diffs: {
    container: '[data-testid="file-by-file-navigation"]',
    prev: '[data-testid="gl-pagination-prev"]',
    next: '[data-testid="gl-pagination-next"]',
    toggleContent: '.diff-file.diff-file-is-active [aria-label="Show file contents"], .diff-file.diff-file-is-active [aria-label="Hide file contents"]',
    activeFile: '.diff-file.diff-file-is-active'
  }
};
