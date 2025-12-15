// Main Content Script Orchestrator

function initAll() {
  console.log('GitLab Pipeline Notifier: Initializing all modules...');

  // Initialize Notifications
  if (typeof initNotifications === 'function') {
    initNotifications();
  }

  // Initialize MR Reorder
  if (typeof initMrReorder === 'function') {
    initMrReorder();
  }

  // Initialize Floating Widget
  if (typeof initFloatingWidget === 'function') {
    initFloatingWidget();
  }
}

// Run on load
initAll();

// Observer for SPA page changes
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    console.log('GitLab Pipeline Notifier: URL changed, re-initializing...');

    // Allow DOM to update first
    setTimeout(() => {
      initAll();
      // Also trigger reorder explicitly as it might pop in later
      if (typeof checkAndReorder === 'function') checkAndReorder();
    }, 1000);
  }

  // Continuous check for MR widget because it loads asynchronously
  if (typeof checkAndReorder === 'function') {
    checkAndReorder();
  }

}).observe(document, { subtree: true, childList: true });
