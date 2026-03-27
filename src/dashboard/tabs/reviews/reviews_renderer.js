const ReviewsRenderer = {
  renderReviews: (containerId, data, mrStates = {}) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!data || data.length === 0) {
      // Re-using the empty state styling from history css
      container.innerHTML = '<div class="empty-state" style="text-align: center; color: var(--gl-text-secondary); padding: 32px 0;"><p>No review history found. Review an MR to get started!</p></div>';
      return;
    }

    let html = '<div class="reviews-container" style="padding: 16px;">';
    
    data.forEach(day => {
      html += `<div class="review-day-group">
                 <h2 class="review-date-header" data-human="${Utils.escapeHtml(day.date)}" data-full="${Utils.escapeHtml(day.exactDate || '')}">${day.date}</h2>`;
      
      day.repositories.forEach(repo => {
        html += `<div class="review-repo-group">
                   <h3 class="review-repo-header">
                     <svg class="repo-icon" viewBox="0 0 16 16" width="14" height="14" fill="currentColor" style="margin-right: 6px;">
                       <path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 1 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 0 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 0 1 1-1h8zM5 12.25v3.25a.25.25 0 0 0 .4.2l1.45-1.087a.25.25 0 0 1 .3 0L8.6 15.7a.25.25 0 0 0 .4-.2v-3.25a.25.25 0 0 0-.25-.25h-3.5a.25.25 0 0 0-.25.25z"/>
                     </svg>
                     ${repo.name}
                   </h3>
                   </h3>`;
        
        if (repo.mrs) {
          repo.mrs.forEach(mr => {
            const stateKey = `${repo.name}:::${mr.id}`;
            const mrState = mrStates && mrStates[stateKey];
            let stateClass = mrState === 'In Review' ? 'custom-badge badge-blue' : ((mrState === 'Done' || mrState === 'N/A') ? 'custom-badge badge-green' : 'badge-add-btn');
            
            const stateDropdown = `
              <div style="position: relative; display: inline-flex; align-items: center; justify-content: center; margin-left: 2px; margin-right: 0;">
                <div class="${stateClass}" style="margin: 0; pointer-events: none; height: 20px; box-sizing: border-box; ${!mrState ? 'padding-bottom: 2px; line-height: 1;' : ''}">${mrState || '+'}</div>
                <!-- Invisible Select overlay -->
                <select class="mr-state-select cursor-pointer" data-repo="${repo.name}" data-mrid="${mr.id}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; appearance: none; outline: none; cursor: pointer;">
                  <option value="" ${!mrState ? 'selected' : ''}>+</option>
                  <option value="In Review" ${mrState === 'In Review' ? 'selected' : ''}>In Review</option>
                  <option value="Done" ${mrState === 'Done' ? 'selected' : ''}>Done</option>
                  <option value="N/A" ${mrState === 'N/A' ? 'selected' : ''}>N/A</option>
                </select>
              </div>`;

            const isApproved = mr.isApproved;
            let highlightStyle = '';
            if (!mrState || (mrState === 'In Review' && isApproved)) {
                // Warning orange tint
                highlightStyle = 'background-color: rgba(230, 172, 0, 0.1); border-left: 3px solid #e6ac00; margin-left: -3px; padding: 8px 8px 4px 0; border-radius: 0 4px 4px 0;';
            }

            // Process title to ensure links work (target="_blank" and absolute URLs)
            let processedTitle = mr.title;
            if (mr.title.includes('<a')) {
                try {
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = mr.title;
                    const repoOrigin = new URL(mr.url).origin;
                    tempDiv.querySelectorAll('a').forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && href.startsWith('/')) link.setAttribute('href', repoOrigin + href);
                        link.setAttribute('target', '_blank');
                        link.setAttribute('rel', 'noopener noreferrer');
                        // Ensure it looks like a link
                        link.style.cursor = 'pointer';
                        link.style.pointerEvents = 'auto';
                    });
                    processedTitle = tempDiv.innerHTML;
                } catch(e) { console.warn('Error processing MR title links:', e); }
            }

            html += `<div class="review-mr-group" style="margin-bottom: 12px; ${highlightStyle}">
                       <div class="review-mr-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px; padding-left: 12px; width: 100%; box-sizing: border-box;">
                         <a href="${mr.url}" target="_blank" class="mr-id">${mr.id}</a>
                         ${stateDropdown}
                         <span class="mr-title-text" style="color: var(--gl-text-color); font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; flex: 1; pointer-events: auto;">${processedTitle}</span>
                         <span style="font-size: 11px; color: var(--gl-text-secondary); flex-shrink: 0;">by ${mr.author}</span>
                       </div>
                       <ul class="review-activities-list">`;
            
            mr.activities.forEach(activity => {
              let actionText;
              if (activity.type === 'approved') {
                actionText = '<span class="review-action review-action-approved">Approved</span>';
              } else if (activity.type === 'revoked') {
                actionText = '<span class="review-action review-action-revoked">Revoked approval</span>';
              } else if (activity.type === 'thread_resolved') {
                actionText = '<span class="review-action review-action-resolved">Resolved thread</span>';
              } else if (activity.type === 'thread_reopened') {
                actionText = '<span class="review-action review-action-reopened">Reopened thread</span>';
              } else {
                actionText = `<span class="review-action review-action-commented">Left ${activity.count} comment${activity.count > 1 ? 's' : ''}</span>`;
              }
                
              html += `<li class="review-activity-item">
                         <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; width: 100%;">
                           <div style="display: flex; align-items: center; gap: 8px;">
                             <span class="review-time">${activity.timestamp}</span>
                             ${actionText}
                           </div>
                           <button class="delete-btn delete-review-btn" data-timestamp="${activity.isoTimestamp}" data-mrid="${mr.id}" data-repo="${repo.name}" title="Remove activity" style="margin-left: 0; padding: 4px;">
                             <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                               <path fill-rule="evenodd" d="M6.5 1.75a.25.25 0 0 1 .25-.25h2.5a.25.25 0 0 1 .25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675l.66 6.6a.25.25 0 0 0 .249.225h5.19a.25.25 0 0 0 .249-.225l.66-6.6a.75.75 0 0 1 1.492.149l-.66 6.6A1.748 1.748 0 0 1 10.595 15h-5.19a1.75 1.75 0 0 1-1.741-1.575l-.66-6.6a.75.75 0 1 1 1.492-.15z"/>
                             </svg>
                           </button>
                         </div>
                       </li>`;
            });
            
            html += `</ul></div>`;
          });
        }
        
        html += `</div>`;
      });
      
      html += `</div>`;
    });

    html += '</div>';
    container.innerHTML = html;
  }
};
