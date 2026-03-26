const ReviewsTab = {
  init: () => {
    InfoBannerRenderer.render('reviewsBannerContainer', "What can I do on this page?", `
      <li style="margin-bottom: 8px;"><strong>DSM Reporting</strong>: Get a full breakdown of your review activity to easily see what MRs you've reviewed or approved today or yesterday.</li>
      <li><strong>Code Review Ticket Tracking</strong>: Update MR statuses natively here to help you remember which code review Jira tickets still need to be updated. Your selected statuses and latest approval activity are used together to dynamically highlight MRs to signify that their associated code review tickets may require attention.</li>
    `);
    ReviewsTab.loadData();
    ReviewsTab.attachListeners();
  },

  loadData: () => {
    if (typeof ReviewRepository === 'undefined') {
      console.error('ReviewRepository is undefined.');
      return;
    }
    
    ReviewRepository.getHistory((history) => {
      ReviewRepository.getMrStates((mrStates) => {
        const groupedData = ReviewsTab.groupHistory(history);
        ReviewsRenderer.renderReviews('reviewsContainer', groupedData, mrStates);
      });
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

    container.addEventListener('change', (e) => {
      if (e.target.classList.contains('mr-state-select')) {
        const repo = e.target.getAttribute('data-repo');
        const mrId = e.target.getAttribute('data-mrid');
        const state = e.target.value;
        
        ReviewRepository.setMrState(repo, mrId, state, () => {
          ReviewsTab.loadData(); // Re-render to update badge classes
        });
      }
    });

    container.addEventListener('mouseover', (e) => {
      if (e.target.classList && e.target.classList.contains('review-date-header')) {
        e.target.innerText = e.target.getAttribute('data-full');
        e.target.classList.add('detailed-time');
      }
    });

    container.addEventListener('mouseout', (e) => {
      if (e.target.classList && e.target.classList.contains('review-date-header')) {
        e.target.innerText = e.target.getAttribute('data-human');
        e.target.classList.remove('detailed-time');
      }
    });
  },

  // Groups flat array of activities into the nested structure expected by the renderer
  groupHistory: (history) => {
    if (!history || history.length === 0) return [];

    // Map the most recent approval state for each MR
    const latestApprovalState = {};
    history.forEach(activity => {
      const key = `${activity.repoName}:::${activity.mrId}`;
      if (latestApprovalState[key] === undefined) {
        if (activity.type === 'approved') latestApprovalState[key] = true;
        else if (activity.type === 'revoked') latestApprovalState[key] = false;
      }
    });

    const grouped = {};
    
    history.forEach(activity => {
      // 1. Group by Date
      const dateObj = new Date(activity.timestamp);
      const dateKey = Utils.getHumanReadableDateOnly(activity.timestamp);
      
      if (!grouped[dateKey]) {
        grouped[dateKey] = {
           __exactDate: dateObj.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        };
      }

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
          isApproved: latestApprovalState[`${repoKey}:::${mrKey}`] || false,
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
      const exactDate = reposObj.__exactDate;
      const reposArray = [];
      for (const [repoName, mrsObj] of Object.entries(reposObj)) {
        if (repoName === '__exactDate') continue;
        const mrsArray = Object.values(mrsObj);
        reposArray.push({
          name: repoName,
          mrs: mrsArray
        });
      }
      result.push({
        date: date,
        exactDate: exactDate,
        repositories: reposArray
      });
    }

    return result;
  }
};
