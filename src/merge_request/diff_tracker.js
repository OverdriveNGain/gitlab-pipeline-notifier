const DiffTracker = {
  init: () => {
    DiffTracker.attachKeyListener();
    Utils.waitForElement(MR_SELECTORS.diffs.container, (container) => {
      DiffTracker.injectHotkeysHint(container);
    });
  },

  attachKeyListener: () => {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      // 1. Only act if we're on a merge request page
      if (!window.location.pathname.includes('/merge_requests/')) {
        return;
      }

      // 2. Only act if on diffs page
      if (!window.location.pathname.includes('/diffs')) {
        return;
      }

      // 3. Early return if typing in inputs
      const activeTagName = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTagName === 'input' || activeTagName === 'textarea' || document.activeElement.isContentEditable) {
        return;
      }

      const isNavigable = !!document.querySelector(MR_SELECTORS.diffs.container);

      switch (key) {
        case ' ': // Space: toggle current file
          if (!isNavigable) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          DiffTracker.toggleActiveFile();
          break;
        case 'a':
        case 'arrowleft': // Prev file
          if (!isNavigable) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          DiffTracker.navigateFile('prev');
          break;
        case 'd':
        case 'arrowright': // Next file
          if (!isNavigable) return;
          e.preventDefault();
          e.stopImmediatePropagation();
          DiffTracker.navigateFile('next');
          break;
      }
    }, true); // Use capture phase on window for max priority
  },

  injectHotkeysHint: (container) => {
    if (document.getElementById('mr-diff-hotkeys-hint')) return;

    const hint = document.createElement('div');
    hint.id = 'mr-diff-hotkeys-hint';
    hint.innerHTML = `
      <div style="margin-top: 12px; font-size: 12px; color: var(--gl-text-secondary, #737278); border-top: 1px solid var(--gl-border-color, #dbd7e6); padding-top: 10px;">
        <span style="font-weight: 600; text-transform: uppercase; margin-right: 8px; opacity: 0.8;">Hotkeys:</span>
        <code style="background: rgba(0,0,0,0.05); padding: 1px 4px; border-radius: 3px; margin: 0 4px;">Space</code> Toggle Content&nbsp;&nbsp;|&nbsp;&nbsp;
        <code style="background: rgba(0,0,0,0.05); padding: 1px 4px; border-radius: 3px; margin: 0 4px;">V</code> Toggle Viewed&nbsp;&nbsp;|&nbsp;&nbsp;
        <code style="background: rgba(0,0,0,0.05); padding: 1px 4px; border-radius: 3px; margin: 0 4px;">A</code> or <code style="background: rgba(0,0,0,0.05); padding: 1px 4px; border-radius: 3px; margin: 0 4px;">←</code> Prev&nbsp;&nbsp;|&nbsp;&nbsp;
        <code style="background: rgba(0,0,0,0.05); padding: 1px 4px; border-radius: 3px; margin: 0 4px;">D</code> or <code style="background: rgba(0,0,0,0.05); padding: 1px 4px; border-radius: 3px; margin: 0 4px;">→</code> Next
      </div>
    `;

    container.appendChild(hint);

    // Sometimes GitLab's Vue navigation area is completely re-rendered, losing our hint.
    // Ensure the hint persists or re-initiates correctly if it goes missing.
    if (!DiffTracker._observed) {
      DiffTracker._observed = true;
      const observer = new MutationObserver((mutations) => {
        if (!document.getElementById('mr-diff-hotkeys-hint')) {
          const newContainer = document.querySelector(MR_SELECTORS.diffs.container);
          if (newContainer) DiffTracker.injectHotkeysHint(newContainer);
        }
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }
  },

  toggleActiveFile: () => {
    const toggleBtn = document.querySelector(MR_SELECTORS.diffs.toggleContent);
    if (toggleBtn) {
      toggleBtn.click();
    }
  },

  navigateFile: (direction) => {
    const selector = direction === 'prev' ? MR_SELECTORS.diffs.prev : MR_SELECTORS.diffs.next;
    const navItem = document.querySelector(selector);

    if (navItem) {
      const anchor = navItem.tagName === 'A' ? navItem : navItem.closest('a');
      const listItem = navItem.closest('li');
      const isDisabled = listItem ? listItem.classList.contains('disabled') : false;

      if (anchor && !isDisabled) {
        anchor.click();
      }
    }
  }
};
