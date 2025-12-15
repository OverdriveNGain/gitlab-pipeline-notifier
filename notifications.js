let isWatching = false;
let checkInterval = null;
let hasNotifiedJobFailure = false;

function initNotifications() {
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

    if (text === 'passed') pipelineStatus = 'success';
    else if (text === 'failed') pipelineStatus = 'failed';
    else if (text === 'canceled') pipelineStatus = 'canceled';
    else if (text.includes('warning')) pipelineStatus = 'warning'; // Handle warning
    else if (text === 'running' || text === 'pending') pipelineStatus = 'running';
  }

  // 2. Check for individual job failures
  // Selector based on sample page: elements with class .ci-job-item-failed
  const failedJobs = document.querySelectorAll('.ci-job-item-failed');
  const hasFailedJobs = failedJobs.length > 0;

  if (pipelineStatus === 'success') {
    notify('Pipeline Succeeded', 'The pipeline has completed successfully.');
    toggleWatch(); // Stop watching
  } else if (pipelineStatus === 'warning') {
    notify('Pipeline Passed with Warnings', 'The pipeline has completed with warnings.');
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
    }
  }
}

function notify(title, body) {
  try {
    chrome.runtime.sendMessage({
      type: 'PIPELINE_NOTIFICATION',
      title: title,
      body: body
    });
  } catch (e) {
    console.error('GitLab Pipeline Notifier: Exception sending message:', e);
  }
}

// Ensure initNotifications is available globally if needed, though in extension scope it usually is just by being in the file.
// We'll trust the manifest order.
