let isWatching = false;
let checkInterval = null;
let pipelineId = null;
let hasNotifiedJobFailure = false;

function init() {
  // Simple detection: check if URL contains '/pipelines/' and looks like a specific pipeline page (has digits at end)
  if (window.location.href.match(/\/pipelines\/\d+/)) {
    injectButton();
  }
}

function injectButton() {
  if (document.getElementById('gitlab-pipeline-notifier-btn')) return;

  const btn = document.createElement('button');
  btn.id = 'gitlab-pipeline-notifier-btn';
  btn.className = 'gitlab-pipeline-notifier-btn';
  btn.textContent = 'Notify me!';
  btn.onclick = toggleWatch;
  document.body.appendChild(btn);
}

function toggleWatch() {
  const btn = document.getElementById('gitlab-pipeline-notifier-btn');
  if (!btn) return;

  isWatching = !isWatching;

  if (isWatching) {
    btn.textContent = 'Watching...';
    btn.classList.add('watching');
    hasNotifiedJobFailure = false; // Reset job failure notification state
    startWatching();
  } else {
    btn.textContent = 'Notify me!';
    btn.classList.remove('watching');
    stopWatching();
  }
}

function handleBeforeUnload(e) {
  // Cancel the event
  e.preventDefault();
  // Chrome requires returnValue to be set
  e.returnValue = '';
}

function startWatching() {
  if (checkInterval) clearInterval(checkInterval);

  // Add exit confirmation
  window.addEventListener('beforeunload', handleBeforeUnload);

  // Poll every 5 seconds
  checkInterval = setInterval(checkStatus, 5000);
  checkStatus(); // Check immediately
}

function stopWatching() {
  if (checkInterval) {
    clearInterval(checkInterval);
    checkInterval = null;
  }
  // Remove exit confirmation
  window.removeEventListener('beforeunload', handleBeforeUnload);
}

function checkStatus() {
  if (!isWatching) return;

  // 1. Check overall pipeline status
  // Selector based on sample page: [data-testid="page-heading-description"] [data-testid="ci-icon-text"]
  const statusTextEl = document.querySelector('[data-testid="page-heading-description"] [data-testid="ci-icon-text"]');
  let pipelineStatus = 'unknown';

  if (statusTextEl) {
    const text = statusTextEl.textContent.trim().toLowerCase();
    if (text === 'passed') pipelineStatus = 'success';
    else if (text === 'failed') pipelineStatus = 'failed';
    else if (text === 'canceled') pipelineStatus = 'canceled';
    else if (text === 'running' || text === 'pending') pipelineStatus = 'running';
  } else {
    // Fallback or log
    console.log('GitLab Pipeline Notifier: Could not find pipeline status element.');
  }

  // 2. Check for individual job failures
  // Selector based on sample page: elements with class .ci-job-item-failed
  const failedJobs = document.querySelectorAll('.ci-job-item-failed');
  const hasFailedJobs = failedJobs.length > 0;

  if (pipelineStatus === 'success') {
    notify('Pipeline Succeeded', 'The pipeline has completed successfully.');
    toggleWatch(); // Stop watching
  } else if (pipelineStatus === 'failed') {
    notify('Pipeline Failed', 'The pipeline has failed.');
    toggleWatch(); // Stop watching
  } else if (pipelineStatus === 'canceled') {
    notify('Pipeline Canceled', 'The pipeline was canceled.');
    toggleWatch(); // Stop watching
  } else if (pipelineStatus === 'running' && hasFailedJobs) {
    if (!hasNotifiedJobFailure) {
      notify('Pipeline Job Failed', 'A job in the pipeline has failed.');
      hasNotifiedJobFailure = true;
      // Continue watching for final status
    }
  }
}

function notify(title, body) {
  chrome.runtime.sendMessage({
    type: 'PIPELINE_NOTIFICATION',
    title: title,
    body: body
  });
}

// Run init on load and on URL change (for SPA navigation)
init();

// Observer for SPA page changes
let lastUrl = location.href;
new MutationObserver(() => {
  const url = location.href;
  if (url !== lastUrl) {
    lastUrl = url;
    // If we navigated away, stop watching?
    // User said: "If the webpage is closed while it is being watched, it will not notify anymore."
    // Navigating away is similar to closing.
    // But if navigating to another pipeline page, maybe we should re-init?
    // For now, let's just re-run init to inject button if needed.
    // If we were watching previous page, and navigated away, the button is gone (DOM replaced), so watching effectively stops visually.
    // But the interval is still running! We should stop it if the button is gone.

    if (!document.getElementById('gitlab-pipeline-notifier-btn')) {
      stopWatching();
      isWatching = false;
    }
    init();
  }
}).observe(document, { subtree: true, childList: true });
