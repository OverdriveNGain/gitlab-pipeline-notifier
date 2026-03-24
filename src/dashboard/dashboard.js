document.addEventListener('DOMContentLoaded', async () => {
  const openFullScreenBtn = document.getElementById('openFullScreenBtn');

  // Tabs
  const tabPipelines = document.getElementById('tabPipelines');
  const tabReviews = document.getElementById('tabReviews');
  const contentPipelines = document.getElementById('contentPipelines');
  const contentReviews = document.getElementById('contentReviews');

  // Check if we are already in full screen mode
  const isFullScreen = new URLSearchParams(window.location.search).get('mode') === 'fullscreen';

  if (tabPipelines && tabReviews) {
    const setActiveTab = (tabName, isInit = false) => {
      if (tabName === 'reviews') {
        tabReviews.classList.add('active');
        tabPipelines.classList.remove('active');
        contentReviews.style.display = '';
        contentPipelines.style.display = 'none';
      } else {
        tabPipelines.classList.add('active');
        tabReviews.classList.remove('active');
        contentPipelines.style.display = '';
        contentReviews.style.display = 'none';
      }
      
      // Do not save changes back to localStorage if we are in Full Screen or doing initial load
      if (!isInit && !isFullScreen) {
        localStorage.setItem('active_tab', tabName);
      }
    };

    // Clean initialization from local storage memory
    const savedTab = localStorage.getItem('active_tab') || 'pipelines';
    setActiveTab(savedTab, true);

    tabPipelines.addEventListener('click', () => setActiveTab('pipelines'));
    tabReviews.addEventListener('click', () => setActiveTab('reviews'));
  }

  if (isFullScreen) {
    if (openFullScreenBtn) openFullScreenBtn.style.display = 'none';
    document.body.classList.add('fullscreen-mode');
  }

  if (openFullScreenBtn) {
    openFullScreenBtn.addEventListener('click', () => {
      const url = chrome.runtime.getURL('src/dashboard/dashboard.html?mode=fullscreen');
      chrome.tabs.create({ url: url });
    });
  }

  // Fetch HTML templates
  try {
    const historyRes = await fetch(chrome.runtime.getURL('src/dashboard/tabs/history/history.html'));
    contentPipelines.innerHTML = await historyRes.text();
  } catch (e) {
    console.error('Failed to fetch history tab', e);
  }

  try {
    const reviewsRes = await fetch(chrome.runtime.getURL('src/dashboard/tabs/reviews/reviews.html'));
    contentReviews.innerHTML = await reviewsRes.text();
  } catch (e) {
    console.error('Failed to fetch reviews tab', e);
  }

  // Init tabs
  if (typeof HistoryTab !== 'undefined') HistoryTab.init();
  if (typeof ReviewsTab !== 'undefined') ReviewsTab.init();

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.pipeline_history) {
      if (typeof HistoryTab !== 'undefined' && HistoryTab.loadData) {
        HistoryTab.loadData();
      }
    }
  });
});
