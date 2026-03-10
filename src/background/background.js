chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('GitLab Pipeline Notifier (Background): Received message:', message);
  if (message.type === 'PIPELINE_NOTIFICATION') {
    console.log('GitLab Pipeline Notifier (Background): Creating notification...');

    // Embed the exact content script's tabId into the notification ID so we can 
    // consistently locate it even if this background Service Worker goes to sleep!
    const notificationId = sender.tab ? `pipeline_${sender.tab.id}_${Date.now()}` : `pipeline_fallback_${Date.now()}`;

    chrome.notifications.create(notificationId, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: message.title,
      message: message.body,
      priority: 2,
      requireInteraction: true
    }, (createdId) => {
      if (chrome.runtime.lastError) {
        console.error('GitLab Pipeline Notifier (Background): Notification error:', chrome.runtime.lastError);
      } else {
        console.log('GitLab Pipeline Notifier (Background): Notification created with ID:', createdId);
      }
    });
  }

  // Send response to keep channel open if needed
  sendResponse({ status: 'received' });
});

chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('GitLab Pipeline Notifier (Background): Notification clicked:', notificationId);

  // 1. Force close the notification itself immediately
  chrome.notifications.clear(notificationId);

  // 2. Decode the originating Tab ID
  if (notificationId.startsWith('pipeline_') && !notificationId.startsWith('pipeline_fallback_')) {
    const parts = notificationId.split('_');
    const tabId = parseInt(parts[1], 10);

    if (!isNaN(tabId)) {
      // Find the tab live to get its *current* window ID (in case user dragged tab to new window)
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) {
          console.error('GitLab Pipeline Notifier: Tab no longer exists.');
          return;
        }

        // 3. Bring the entire window to the forefront first
        chrome.windows.update(tab.windowId, { focused: true }, () => {
          // 4. Force Edge / Chrome to make this exact tab the actively viewed tab in that window
          chrome.tabs.update(tabId, { active: true });
        });
      });
    }
  }
});
