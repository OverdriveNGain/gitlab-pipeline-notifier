const TRACKER_SELECTORS = {
  // New Pipeline Page
  newPipelineForm: '#new_pipeline',
  runButton: '[data-testid="run-pipeline-button"]',
  variableRow: '[data-testid="ci-variable-row-container"]',
  variableKey: '[data-testid="pipeline-form-ci-variable-key-field"]',
  variableValue: '[data-testid="pipeline-form-ci-variable-value-field"]',
  branchSelector: '[data-testid="branch-select-button"]',
  branchDropdownToggle: '[data-testid="branch-select-button"] .dropdown-toggle-text',

  // Active Pipeline Page
  pipelineStatus: '[data-testid="ci-icon-text"]',
  pipelineId: null, // Extracted from URL usually
  pipelineRef: '[data-testid="pipeline-ref-text"]',
  pipelineHeader: '[data-testid="pipeline-header"]',
  pageHeading: '[data-testid="page-heading"]',
  pageHeadingActions: '[data-testid="page-heading-actions"]',
  pageBreadcrumbs: '.gl-breadcrumbs'
};
