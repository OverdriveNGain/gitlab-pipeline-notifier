function initFloatingWidget() {
  console.log('GitLab Pipeline Notifier: Initializing floating widget...');

  // Create the floating container
  const floatingWidget = document.createElement('div');
  floatingWidget.className = 'gitlab-mr-floating-widget';
  floatingWidget.innerHTML = '<h4>MR Status</h4><div class="content">Loading...</div>';
  document.body.appendChild(floatingWidget);

  const updateFloatingContent = () => {
    const mainWidget = document.getElementById('widget-state');
    if (!mainWidget) return;

    const contentDiv = floatingWidget.querySelector('.content');
    contentDiv.innerHTML = '';

    // 1. Pipeline Status Text
    const pipelineTitleEl = mainWidget.querySelector('.mr-pipeline-title');
    const pipelineStatusText = pipelineTitleEl ? pipelineTitleEl.innerText.trim().replace(/\s+/g, ' ') : 'Pipeline status not found';

    // 2. Status Icon & Color Logic
    // Find the wrapper to get the status variant
    const iconWrapper = mainWidget.querySelector('[data-testid="ci-icon"]');
    const statusIcon = iconWrapper ? iconWrapper.querySelector('svg').cloneNode(true) : null;

    // Determine color
    let color = '#333'; // default
    if (iconWrapper) {
      if (iconWrapper.classList.contains('ci-icon-variant-success') || iconWrapper.getAttribute('variant') === 'success') {
        color = '#108548'; // Green
      } else if (iconWrapper.classList.contains('ci-icon-variant-failed') || iconWrapper.getAttribute('variant') === 'failed') {
        color = '#db3b21'; // Red
      } else if (iconWrapper.classList.contains('ci-icon-variant-running') || iconWrapper.getAttribute('variant') === 'running') {
        color = '#1f75cb'; // Blue
      } else if (iconWrapper.classList.contains('ci-icon-variant-warning') || iconWrapper.getAttribute('variant') === 'warning') {
        color = '#d9730d'; // Orange
      }
    }

    // Fallback: Check status icon href if color is still default
    if (color === '#333' && statusIcon) {
      const useEl = statusIcon.querySelector('use');
      if (useEl) {
        const href = useEl.getAttribute('href') || '';
        if (href.includes('status_success')) color = '#108548';
        else if (href.includes('status_failed')) color = '#db3b21';
        else if (href.includes('status_running')) color = '#1f75cb';
        else if (href.includes('status_warning')) color = '#d9730d';
      }
    }

    const pipelineRow = document.createElement('div');
    pipelineRow.className = 'widget-row';
    pipelineRow.style.color = color;
    pipelineRow.style.fontWeight = '500';

    if (statusIcon) {
      statusIcon.style.width = '16px';
      statusIcon.style.height = '16px';
      statusIcon.style.minWidth = '16px';
      statusIcon.style.fill = 'currentColor'; // Force icon to take text color
      pipelineRow.appendChild(statusIcon);
    }

    const statusSpan = document.createElement('span');
    statusSpan.innerText = pipelineStatusText;
    pipelineRow.appendChild(statusSpan);

    contentDiv.appendChild(pipelineRow);

    // Add a left border for better visibility of status
    floatingWidget.style.borderLeft = `4px solid ${color}`;
  };

  // Observer
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      // If widget is NOT intersecting (out of view)
      if (!entry.isIntersecting) {
        updateFloatingContent(); // Refresh content before showing
        floatingWidget.classList.add('visible');
      } else {
        floatingWidget.classList.remove('visible');
      }
    });
  }, {
    root: null, // viewport
    threshold: 0
  });

  // Watch for the main widget appearance
  const checkForWidget = setInterval(() => {
    const widget = document.getElementById('widget-state');
    if (widget) {
      console.log('GitLab Pipeline Notifier: Found widget, observing...');
      observer.observe(widget);

      // Also watch for changes within the widget to update the floating one live
      const mutationObserver = new MutationObserver(() => {
        if (floatingWidget.classList.contains('visible')) {
          updateFloatingContent();
        }
      });
      mutationObserver.observe(widget, { subtree: true, childList: true, characterData: true });

      clearInterval(checkForWidget);
    }
  }, 1000);
}

// Ensure it's globally available if needed, or just relied on content.js to call it if we don't use modules.
// Since we are just concatenating/loading scripts, this function will be global.
