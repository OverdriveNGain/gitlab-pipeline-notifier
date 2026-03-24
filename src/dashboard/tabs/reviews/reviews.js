const ReviewsTab = {
  init: () => {
    ReviewsTab.loadData();
    ReviewsTab.attachListeners();
  },

  loadData: () => {
    if (typeof ReviewRepository === 'undefined') {
      console.error('ReviewRepository is undefined.');
      return;
    }
    
    ReviewRepository.getHistory((history) => {
      const groupedData = ReviewsTab.groupHistory(history);
      ReviewsRenderer.renderReviews('reviewsContainer', groupedData);
    });
  },

  attachListeners: () => {
    const container = document.getElementById('reviewsContainer');
    if (!container) return;

    // We only attach this once
    if (container.dataset.listenerAttached) return;
    container.dataset.listenerAttached = 'true';

    container.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.delete-review-btn');
      if (deleteBtn) {
        const timestamp = deleteBtn.getAttribute('data-timestamp');
        const mrId = deleteBtn.getAttribute('data-mrid');
        const repo = deleteBtn.getAttribute('data-repo');
        
        if (confirm('Are you sure you want to remove this review activity?')) {
          ReviewRepository.deleteReviewActivity(timestamp, mrId, repo, () => {
            ReviewsTab.loadData(); // Re-render from updated dataset mapping
          });
        }
      }
    });
  },

  // Groups flat array of activities into the nested structure expected by the renderer
  groupHistory: (history) => {
    if (!history || history.length === 0) return [];

    const grouped = {};
    
    history.forEach(activity => {
      // 1. Group by Date
      const dateObj = new Date(activity.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      let dateKey = dateObj.toLocaleDateString();
      if (dateObj.toDateString() === today.toDateString()) {
        dateKey = 'Today';
      } else if (dateObj.toDateString() === yesterday.toDateString()) {
        dateKey = 'Yesterday';
      }

      if (!grouped[dateKey]) grouped[dateKey] = {};

      // 2. Group by Repository
      const repoKey = activity.repoName || 'Unknown Repository';
      if (!grouped[dateKey][repoKey]) grouped[dateKey][repoKey] = {};

      // 3. Group by MR
      const mrKey = activity.mrId || 'Unknown MR';
      if (!grouped[dateKey][repoKey][mrKey]) {
        grouped[dateKey][repoKey][mrKey] = {
          id: activity.mrId,
          url: activity.mrUrl || '#',
          title: activity.mrTitle || 'Unknown Title',
          author: activity.author || 'Unknown Author',
          activities: []
        };
      }

      // Format time for the current activity
      let timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      grouped[dateKey][repoKey][mrKey].activities.push({
        isoTimestamp: activity.timestamp,
        timestamp: timeStr,
        type: activity.type,
        count: activity.count
      });
    });

    // Convert deeply nested objects back to arrays for the renderer expected structure
    const result = [];
    for (const [date, reposObj] of Object.entries(grouped)) {
      const reposArray = [];
      for (const [repoName, mrsObj] of Object.entries(reposObj)) {
        const mrsArray = Object.values(mrsObj);
        reposArray.push({
          name: repoName,
          mrs: mrsArray
        });
      }
      result.push({
        date: date,
        repositories: reposArray
      });
    }

    return result;
  }
};
