const ReviewsTracker = {
  init: () => {
    // Only run if we are on a Merge Request page
    if (!window.location.pathname.includes('/-/merge_requests/')) return;

    ReviewsTracker.attachListeners();
  },

  getMrDetails: () => {
    // Extract Repo Name & MR ID from URL
    // e.g., /mobile/front-end/flutter/sdks/shared/shared-features/-/merge_requests/237
    const pathParts = window.location.pathname.split('/-/merge_requests/');
    const fullRepoPath = pathParts[0].substring(1); // Remove leading slash
    const repoNameParts = fullRepoPath.split('/');
    const repoName = repoNameParts[repoNameParts.length - 1]; // Only the repository name itself
    const mrId = `!${pathParts[1].split('/')[0]}`; // Extract just the ID number

    // Extract Title
    const titleEl = document.querySelector('h1[data-testid="title-content"]');
    let mrTitle = 'Unknown MR';
    if (titleEl) {
      const clonedTitle = titleEl.cloneNode(true);
      const copyHint = clonedTitle.querySelector('#mr-copy-hint');
      if (copyHint) copyHint.remove();
      
      // Ensure all links have absolute URLs and target="_blank"
      clonedTitle.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && href.startsWith('/')) {
            a.setAttribute('href', window.location.origin + href);
        }
        a.setAttribute('target', '_blank');
        a.setAttribute('rel', 'noopener noreferrer');
      });

      mrTitle = clonedTitle.innerHTML.trim();
      // Clean up common prefixes like "Draft:"
      mrTitle = mrTitle.replace(/^(?:Draft|WIP|Draft \/ WIP|Resolved):\s*/i, '');
    }

    // Extract Author
    const authorEl = document.querySelector('a[data-testid="author-link"] .author');
    const author = authorEl ? authorEl.textContent.trim() : 'Unknown Author';

    const mrUrl = window.location.origin + window.location.pathname;

    return { repoName, mrId, mrTitle, author, mrUrl };
  },

  logActivity: (type, count = undefined) => {
    const details = ReviewsTracker.getMrDetails();
    if (!details.repoName || !details.mrId) return;

    const activity = {
      timestamp: new Date().toISOString(),
      type: type, // 'approved', 'revoked', 'commented'
      repoName: details.repoName,
      mrId: details.mrId,
      mrUrl: details.mrUrl,
      mrTitle: details.mrTitle,
      author: details.author
    };

    if (count !== undefined) {
      activity.count = count;
    }

    if (typeof ReviewRepository !== 'undefined') {
      ReviewRepository.addReviewActivity(activity, () => {
        console.log(`[GitLab+] Successfully logged review activity: ${type}`);
      });
    } else {
      console.warn('[GitLab+] ReviewRepository not found in content script context.');
    }
  },

  attachListeners: () => {
    // Use event delegation on the document body since Vue dynamically loads DOM elements
    document.body.addEventListener('click', (e) => {
      const targetBtn = e.target.closest('button');
      if (!targetBtn) return;

      const testId = targetBtn.getAttribute('data-testid');
      const textBtnInner = targetBtn.querySelector('.gl-button-text');
      const text = textBtnInner ? textBtnInner.textContent.trim() : targetBtn.textContent.trim();

      // 1. Approve / Approve additionally / Revoke approval
      if (testId === 'approve-button') {
        if (text === 'Approve' || text === 'Approve additionally') {
          ReviewsTracker.logActivity('approved');
        } else if (text === 'Revoke approval') {
          ReviewsTracker.logActivity('revoked');
        }
        return;
      }

      // 2. Individual Comment / Thread (Standard footer "Comment" / "Start thread", or inline "Add comment now")
      if (testId === 'comment-now-button' || text === 'Add comment now' || (targetBtn.getAttribute('type') === 'submit' && (text === 'Comment' || text === 'Start thread'))) {
        ReviewsTracker.logActivity('commented', 1);
        return;
      }

      // 3. Resolve / Reopen thread
      const ariaLabel = (targetBtn.getAttribute('aria-label') || targetBtn.getAttribute('data-original-title') || targetBtn.getAttribute('title') || '').toLowerCase();
      const testIdString = testId || '';
      
      if (testIdString.includes('resolve-line-button') || testIdString.includes('resolve-discussion') || ariaLabel.includes('resolve') || ariaLabel.includes('reopen') || targetBtn.classList.contains('js-resolve-btn') || targetBtn.classList.contains('note-action-button')) {
        // For buttons that strictly match the resolve/unresolve intent
        if (ariaLabel.includes('resolve') || ariaLabel.includes('reopen') || ariaLabel.includes('unresolve') || testIdString.includes('resolve')) {
          if (ariaLabel.includes('unresolve') || ariaLabel.includes('reopen') || (text && text.toLowerCase().includes('reopen'))) {
            ReviewsTracker.logActivity('thread_reopened');
          } else {
            ReviewsTracker.logActivity('thread_resolved');
          }
          return;
        }
      }

      // 4. Submit Review (Batch of comments from reviewing multiple files)
      if (targetBtn.getAttribute('data-testid') === 'submit-review-button') {
        let draftCount = 1; // Fallback

        // Find the toggle button to extract the exact number of drafts prepared
        const drawerToggle = document.querySelector('button[data-testid="review-drawer-toggle"]');
        if (drawerToggle) {
          const badge = drawerToggle.querySelector('.gl-badge-content');
          if (badge) {
            // Format is generally "1 \n draft" -> match the integer
            const match = badge.textContent.match(/(\d+)/);
            if (match) {
              draftCount = parseInt(match[1], 10);
            }
          }
        }

        ReviewsTracker.logActivity('commented', draftCount);
        return;
      }
    }, true);
  }
};
