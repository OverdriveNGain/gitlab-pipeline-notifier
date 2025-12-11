chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'PIPELINE_NOTIFICATION') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: message.title,
      message: message.body,
      priority: 2
    });
  }
});
