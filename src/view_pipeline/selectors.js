const TRACKER_SELECTORS = {
  // Active Pipeline Page
  pipelineStatus: '[data-testid="ci-icon-text"]',
  pipelineId: null, // Extracted from URL usually
  pipelineRef: '[data-testid="pipeline-ref-text"]',
  pipelineHeader: '[data-testid="pipeline-header"]',
  pageHeading: '[data-testid="page-heading"]',
  pageHeadingActions: '[data-testid="page-heading-actions"]',
  pageBreadcrumbs: '.gl-breadcrumbs'
};
