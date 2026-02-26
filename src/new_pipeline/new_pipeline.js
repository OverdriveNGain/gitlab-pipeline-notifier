const NewPipelineTracker = {
  init: () => {
    // We need to wait for the button to exist, as it's a Vue app
    Utils.waitForElement(TRACKER_SELECTORS.runButton, (btn) => {
      console.log('GitLab Pipeline Tracker: Run button found, attaching listener');
      NewPipelineTracker.injectLabelInput(btn);

      // Use capture phase to ensure we get the event before any immediate navigation/submission
      btn.addEventListener('click', NewPipelineTracker.handleRunPipelineClick, true);
    });
  },

  injectLabelInput: (btn) => {
    if (document.getElementById('pipeline-tracker-label-container')) return;

    const container = document.createElement('div');
    container.id = 'pipeline-tracker-label-container';
    container.style.marginBottom = '12px';

    const label = document.createElement('label');
    label.innerText = 'Pipeline Label (for local history)';
    label.style.display = 'block';
    label.style.fontWeight = 'bold';
    label.style.marginBottom = '4px';

    const input = document.createElement('input');
    input.id = 'pipeline-tracker-label-input';
    input.type = 'text';
    input.placeholder = 'e.g. Release Candidate 1.0 (Optional)';
    input.className = 'form-control gl-form-input';
    input.style.width = '100%';
    input.style.maxWidth = '400px';

    container.appendChild(label);
    container.appendChild(input);

    const notice = document.createElement('div');
    notice.innerText = 'ℹ️ Running this pipeline will log parameters to your local Pipeline History extension.';
    notice.style.cssText = 'margin-top: 4px; font-size: 12px; color: var(--gl-text-secondary, #666);';
    container.appendChild(notice);

    const parent = btn.parentNode;
    if (parent && (parent.tagName === 'DIV' || parent.classList.contains('gl-flex'))) {
      parent.parentNode.insertBefore(container, parent);
    } else {
      btn.parentNode.insertBefore(container, btn);
    }
  },

  handleRunPipelineClick: (e) => {
    console.log('GitLab Pipeline Tracker: Run Pipeline clicked');
    const variables = NewPipelineTracker.captureVariables();
    const branch = NewPipelineTracker.captureRef();

    const labelInput = document.getElementById('pipeline-tracker-label-input');
    const customLabel = labelInput ? labelInput.value.trim() : '';

    const timestamp = Date.now();
    const pendingData = {
      timestamp: timestamp,
      branch: branch,
      ref: branch,
      variables: variables,
      label: customLabel,
      projectName: NewPipelineTracker.captureProjectName(),
      projectPath: NewPipelineTracker.getProjectPath()
    };

    PipelineRepository.savePending(pendingData, () => {
      console.log('GitLab Pipeline Tracker: Pending pipeline data saved', pendingData);
    });
  },

  captureVariables: () => {
    const vars = [];
    const rows = document.querySelectorAll(TRACKER_SELECTORS.variableRow);
    rows.forEach(row => {
      const keyInput = row.querySelector(TRACKER_SELECTORS.variableKey);
      const valueInput = row.querySelector(TRACKER_SELECTORS.variableValue);

      if (keyInput && valueInput) {
        const key = keyInput.value.trim();
        const value = valueInput.value;
        if (key) {
          vars.push({ key, value });
        }
      }
    });
    return vars;
  },

  captureRef: () => {
    // There can be multiple base-dropdown-toggle elements. 
    // The branch selector has an aria-labelledby attribute containing "pipeline-ref-label"
    let el = document.querySelector('button[aria-labelledby*="pipeline-ref-label"] .gl-new-dropdown-button-text');

    if (!el) {
      el = document.querySelector('[data-testid="base-dropdown-toggle"] .gl-new-dropdown-button-text');
    }

    if (!el) {
      el = document.querySelector(TRACKER_SELECTORS.branchSelector + ' button');
    }

    if (!el) {
      el = document.querySelector(TRACKER_SELECTORS.branchSelector);
    }

    if (el) return el.innerText.trim();

    const hiddenInput = document.querySelector('input[name="ref"]');
    if (hiddenInput) return hiddenInput.value;

    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('ref')) return urlParams.get('ref');

    return 'unknown';
  },

  getProjectPath: () => {
    const parts = window.location.pathname.split('/-/');
    if (parts.length > 0) {
      return parts[0].substring(1);
    }
    return 'unknown';
  },

  captureProjectName: () => {
    const breadcrumbs = document.querySelector(TRACKER_SELECTORS.breadcrumbs);
    if (!breadcrumbs) return 'Unknown Project';

    // The last item in breadcrumbs is typically "Pipelines" or "New" on this page, 
    // so we need the one before the group/subgroup chain ends, or the last project-like link.
    // Based on the provided HTML structure, the project name is the last link before "Pipelines" or just the last link in the chain that isn't the current page.

    // Strategy: Get all 'a' tags in breadcrumbs.
    const methods = breadcrumbs.querySelectorAll('li a');
    if (methods.length > 0) {
      // On "New Pipeline" page: ... > Project Name > Pipelines > New
      // We want "Project Name".
      // Let's filter out "Pipelines" and "New" if they exist, or just take the last meaningful one.

      for (let i = methods.length - 1; i >= 0; i--) {
        const text = methods[i].innerText.trim();
        const lowerText = text.toLowerCase();
        if (text !== 'Pipelines' && text !== 'New' && text !== 'Jobs' && lowerText !== 'new pipeline') {
          return text;
        }
      }
    }

    return 'Unknown Project';
  }
};
