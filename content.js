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
  if (document.getElementById('gitlab-pipeline-notifier-container')) return;

  const container = document.createElement('div');
  container.id = 'gitlab-pipeline-notifier-container';
  container.className = 'gitlab-pipeline-notifier-container';

  const btn = document.createElement('button');
  btn.id = 'gitlab-pipeline-notifier-btn';
  btn.className = 'gitlab-pipeline-notifier-btn';
  btn.textContent = 'Notify me!';
  btn.onclick = toggleWatch;

  const testBtn = document.createElement('button');
  testBtn.id = 'gitlab-pipeline-notifier-test-btn';
  testBtn.className = 'gitlab-pipeline-notifier-btn gitlab-pipeline-notifier-test-btn';
  testBtn.textContent = 'Test';
  testBtn.onclick = () => {
    console.log('GitLab Pipeline Notifier: Test button clicked');
    notify('Test Notification', 'This is a test notification from GitLab Pipeline Notifier.');
  };

  container.appendChild(btn);
  container.appendChild(testBtn);
  document.body.appendChild(container);
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

  console.log('GitLab Pipeline Notifier: Checking status...');

  // 1. Check overall pipeline status
  // Selector based on sample page: [data-testid="page-heading-description"] [data-testid="ci-icon-text"]
  const statusTextEl = document.querySelector('[data-testid="page-heading-description"] [data-testid="ci-icon-text"]');
  let pipelineStatus = 'unknown';

  if (statusTextEl) {
    const text = statusTextEl.textContent.trim().toLowerCase();
    console.log(`GitLab Pipeline Notifier: Found status text: "${text}"`);

    if (text === 'passed') pipelineStatus = 'success';
    else if (text === 'failed') pipelineStatus = 'failed';
    else if (text === 'canceled') pipelineStatus = 'canceled';
    else if (text.includes('warning')) pipelineStatus = 'warning'; // Handle warning
    else if (text === 'running' || text === 'pending') pipelineStatus = 'running';
  } else {
    // Fallback or log
    console.log('GitLab Pipeline Notifier: Could not find pipeline status element.');
  }

  console.log(`GitLab Pipeline Notifier: Determined pipeline status: "${pipelineStatus}"`);

  // 2. Check for individual job failures
  // Selector based on sample page: elements with class .ci-job-item-failed
  const failedJobs = document.querySelectorAll('.ci-job-item-failed');
  const hasFailedJobs = failedJobs.length > 0;
  console.log(`GitLab Pipeline Notifier: Failed jobs count: ${failedJobs.length}`);

  if (pipelineStatus === 'success') {
    console.log('GitLab Pipeline Notifier: Pipeline success detected. Notifying.');
    notify('Pipeline Succeeded', 'The pipeline has completed successfully.');
    toggleWatch(); // Stop watching
  } else if (pipelineStatus === 'warning') {
    console.log('GitLab Pipeline Notifier: Pipeline warning detected. Notifying.');
    notify('Pipeline Passed with Warnings', 'The pipeline has completed with warnings.');
    toggleWatch(); // Stop watching
  } else if (pipelineStatus === 'failed') {
    console.log('GitLab Pipeline Notifier: Pipeline failure detected. Notifying.');
    notify('Pipeline Failed', 'The pipeline has failed.');
    toggleWatch(); // Stop watching
  } else if (pipelineStatus === 'canceled') {
    console.log('GitLab Pipeline Notifier: Pipeline canceled detected. Notifying.');
    notify('Pipeline Canceled', 'The pipeline was canceled.');
    toggleWatch(); // Stop watching
  } else if (pipelineStatus === 'running' && hasFailedJobs) {
    if (!hasNotifiedJobFailure) {
      console.log('GitLab Pipeline Notifier: Job failure detected while running. Notifying.');
      notify('Pipeline Job Failed', 'A job in the pipeline has failed.');
      hasNotifiedJobFailure = true;
      // Continue watching for final status
    } else {
      console.log('GitLab Pipeline Notifier: Job failure detected but already notified.');
    }
  } else {
    console.log('GitLab Pipeline Notifier: No status change requiring notification.');
  }
}

function notify(title, body) {
  console.log(`GitLab Pipeline Notifier: Sending notification - Title: "${title}", Body: "${body}"`);
  try {
    chrome.runtime.sendMessage({
      type: 'PIPELINE_NOTIFICATION',
      title: title,
      body: body
    }, (response) => {
      if (chrome.runtime.lastError) {
        console.error('GitLab Pipeline Notifier: Error sending message:', chrome.runtime.lastError);
      } else {
        console.log('GitLab Pipeline Notifier: Message sent successfully. Response:', response);
      }
    });
  } catch (e) {
    console.error('GitLab Pipeline Notifier: Exception sending message:', e);
  }
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

    if (!document.getElementById('gitlab-pipeline-notifier-container')) {
      stopWatching();
      isWatching = false;
    }
    init();
  }
}).observe(document, { subtree: true, childList: true });
