function initMrReorder() {
  console.log('GitLab Pipeline Notifier: Initializing MR Reorder...');
  checkAndReorder(); // Run immediately in case we are late
}

function checkAndReorder() {
  // Target: #widget-state
  // Destination Container: The first <section> inside .merge-request-overview

  const widget = document.getElementById('widget-state');
  const overviewSection = document.querySelector('.merge-request-overview section');

  if (widget && overviewSection) {
    // Check if widget is already the first child of the section
    if (overviewSection.firstElementChild === widget) {
      // Already correct
      return;
    }

    console.log('GitLab Pipeline Notifier: Moving MR widget to top of overview section...');
    overviewSection.prepend(widget);
  }
}

// Expose checks if needed, but main loop in content.js will drive this or we can add own observer here if we want decoupling.
// For now, we will let content.js drive the SPA observation and call us.
