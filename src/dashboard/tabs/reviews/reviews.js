const ReviewsTab = {
  formatTime12h: (time24h) => {
    if (!time24h) return time24h;
    const [h, m] = time24h.split(':');
    const hours = parseInt(h, 10);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${m} ${ampm}`;
  },

  init: () => {
    InfoBannerRenderer.render('reviewsBannerContainer', "What can I do on this page?", `
      <li style="margin-bottom: 8px;"><strong>DSM Reporting</strong>: Get a full breakdown of your review activity to easily see what MRs you've reviewed or approved today or yesterday.</li>
      <li><strong>Code Review Ticket Tracking</strong>: Update MR statuses natively here to help you remember which code review Jira tickets still need to be updated. Your selected statuses and latest approval activity are used together to dynamically highlight MRs to signify that their associated code review tickets may require attention.</li>
    `);
    
    const savedType = localStorage.getItem('review_filter_type') || '3_days_ago';
    const filterInput = document.getElementById('reviewDateFilter');
    const customOpt = document.getElementById('customDatetimeOption');
    const editBtn = document.getElementById('editReviewTimeBtn');

    if (filterInput) {
      filterInput.value = savedType;
      if (savedType === 'custom_datetime') {
        const savedTs = localStorage.getItem('review_filter_custom_ts');
        if (savedTs && customOpt) {
          customOpt.innerText = `Show logs starting from ${Utils.getHumanReadableDate(parseInt(savedTs, 10))}`;
        }
        if (editBtn) editBtn.style.display = 'flex';
      }
    }
    
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
        const filterInput = document.getElementById('reviewDateFilter');
        const filterType = filterInput ? filterInput.value : '3_days_ago';
        let filterTimestamp = 0;
        
        const now = new Date();
        if (filterType === '3_days_ago') {
          const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3);
          filterTimestamp = d.getTime();
        } else if (filterType === 'custom_datetime') {
          const savedTs = localStorage.getItem('review_filter_custom_ts');
          if (savedTs) {
            filterTimestamp = parseInt(savedTs, 10);
          } else {
            // Default to today at 9 AM if nothing saved
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 0, 0, 0);
            filterTimestamp = d.getTime();
          }
        } else if (filterType === 'all') {
          filterTimestamp = 0;
        }

        const groupedData = ReviewsTab.groupHistory(history, filterTimestamp);
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

    const filterInput = document.getElementById('reviewDateFilter');
    const customOpt = document.getElementById('customDatetimeOption');
    const editBtn = document.getElementById('editReviewTimeBtn');

    const handleCustomTimePrompt = () => {
      const savedTs = localStorage.getItem('review_filter_custom_ts');
      let defaultVal = "";
      if (savedTs) {
        const d = new Date(parseInt(savedTs, 10));
        const dateStr = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
        const timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        defaultVal = `${dateStr} ${timeStr}`;
      } else {
        const d = new Date();
        defaultVal = `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')} 09:00`;
      }

      const input = prompt("Enter a starting date and time (YYYY-MM-DD HH:MM or use 'today HH:MM' / 'yesterday HH:MM'):", defaultVal);
      
      if (input === null) {
        if (!localStorage.getItem('review_filter_custom_ts')) {
          if (filterInput) filterInput.value = '3_days_ago';
          localStorage.setItem('review_filter_type', '3_days_ago');
          if (editBtn) editBtn.style.display = 'none';
          if (customOpt) customOpt.innerText = `Show logs starting from datetime X`;
        } else {
          if (filterInput) filterInput.value = localStorage.getItem('review_filter_type');
        }
        return false;
      }
      
      let targetDate = new Date();
      let timeMatch = null;

      const lowerInput = input.toLowerCase().trim();
      if (lowerInput.startsWith('today')) {
        targetDate = new Date();
        timeMatch = lowerInput.replace('today', '').trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
      } else if (lowerInput.startsWith('yesterday')) {
        targetDate = new Date(Date.now() - 86400000);
        timeMatch = lowerInput.replace('yesterday', '').trim().match(/(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?/i);
      } else {
        // Try parsing as full datetime
        const d = new Date(input);
        if (!isNaN(d.getTime())) {
          targetDate = d;
          timeMatch = { fullMatch: true }; // Dummy to skip time parsing below
        } else {
          // Try regex for YYYY-MM-DD HH:MM
          const fullMatch = input.trim().match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})\s*(AM|PM|am|pm)?$/i);
          if (fullMatch) {
            targetDate = new Date(fullMatch[1]);
            timeMatch = [null, fullMatch[2], fullMatch[3], fullMatch[4]];
          }
        }
      }

      if (timeMatch && !timeMatch.fullMatch) {
        let hours = parseInt(timeMatch[1], 10);
        const mins = parseInt(timeMatch[2], 10);
        const ampm = timeMatch[3] ? timeMatch[3].toLowerCase() : null;
        if (ampm === 'pm' && hours < 12) hours += 12;
        if (ampm === 'am' && hours === 12) hours = 0;
        targetDate.setHours(hours, mins, 0, 0);
      } else if (!timeMatch) {
        alert("Invalid format. Please use 'YYYY-MM-DD HH:MM', 'today HH:MM', or 'yesterday HH:MM'.");
        return handleCustomTimePrompt();
      }
      
      const finalTs = targetDate.getTime();
      localStorage.setItem('review_filter_custom_ts', finalTs);
      if (customOpt) customOpt.innerText = `Show logs starting from ${Utils.getHumanReadableDate(finalTs)}`;
      return true;
    };

    if (filterInput && !filterInput.dataset.listenerAttached) {
      filterInput.dataset.listenerAttached = 'true';
      filterInput.addEventListener('change', (e) => {
        const val = e.target.value;
        localStorage.setItem('review_filter_type', val);
        
        if (val === 'custom_datetime') {
          if (handleCustomTimePrompt()) {
            if (editBtn) editBtn.style.display = 'flex';
            ReviewsTab.loadData();
          }
        } else {
          if (editBtn) editBtn.style.display = 'none';
          ReviewsTab.loadData();
        }
      });
    }

    if (editBtn && !editBtn.dataset.listenerAttached) {
      editBtn.dataset.listenerAttached = 'true';
      editBtn.addEventListener('click', () => {
        const currentType = localStorage.getItem('review_filter_type');
        if (currentType === 'custom_datetime') {
          if (handleCustomTimePrompt()) ReviewsTab.loadData();
        }
      });
    }

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
  groupHistory: (history, filterTimestamp = 0) => {
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
    
    const activeHistory = filterTimestamp > 0
      ? history.filter(activity => new Date(activity.timestamp).getTime() >= filterTimestamp)
      : history;
    
    activeHistory.forEach(activity => {
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
