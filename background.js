// Map to store notification ID -> { tabId, windowId }
const notificationMap = new Map();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('GitLab Pipeline Notifier (Background): Received message:', message);
  if (message.type === 'PIPELINE_NOTIFICATION') {
    console.log('GitLab Pipeline Notifier (Background): Creating notification...');

    // Store tab/window info if available
    const context = {};
    if (sender.tab) {
      context.tabId = sender.tab.id;
      context.windowId = sender.tab.windowId;
    }

    chrome.notifications.create({
      type: 'basic',
      iconUrl: chrome.runtime.getURL('icons/icon48.png'),
      title: message.title,
      message: message.body,
      priority: 2,
      requireInteraction: true
    }, (notificationId) => {
      if (chrome.runtime.lastError) {
        console.error('GitLab Pipeline Notifier (Background): Notification error:', chrome.runtime.lastError);
      } else {
        console.log('GitLab Pipeline Notifier (Background): Notification created with ID:', notificationId);
        if (context.tabId) {
          notificationMap.set(notificationId, context);
        }
      }
    });
  }
  sendResponse({ status: 'received' }); // Send response to keep channel open if needed
});

chrome.notifications.onClicked.addListener((notificationId) => {
  console.log('GitLab Pipeline Notifier (Background): Notification clicked:', notificationId);
  const context = notificationMap.get(notificationId);

  if (context) {
    if (context.windowId) {
      chrome.windows.update(context.windowId, { focused: true }).catch(err => console.error(err));
    }
    if (context.tabId) {
      chrome.tabs.update(context.tabId, { active: true }).catch(err => console.error(err));
    }
    // Clean up
    notificationMap.delete(notificationId);
  }
});
