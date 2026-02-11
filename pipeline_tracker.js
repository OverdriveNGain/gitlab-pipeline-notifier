// Pipeline Tracker for GitLab Pipeline Notifier

const PIPELINE_TRACKER = {
  init() {
    console.log('GitLab Pipeline Tracker: Initializing...');
    this.detectPage();
  },

  detectPage() {
    const path = window.location.pathname;

    // Check if "New Pipeline" page: /pipelines/new
    if (path.endsWith('/pipelines/new')) {
      console.log('GitLab Pipeline Tracker: Detected New Pipeline page');
      NewPipelineTracker.init();
    }
    // Check if "Pipeline View" page: /pipelines/<id> (and not /pipelines or /pipelines/charts etc.)
    else if (path.match(/\/pipelines\/\d+$/)) {
      console.log('GitLab Pipeline Tracker: Detected Pipeline View page');
      PipelineViewTracker.init();
    } else {
      // Just waiting
    }
  }
};

// Initialize
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => PIPELINE_TRACKER.init());
} else {
  PIPELINE_TRACKER.init();
}
