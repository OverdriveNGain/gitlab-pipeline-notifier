const PipelineViewTracker = {
  init: () => {
    // 1. Check if we have a pending pipeline that matches this
    PipelineRepository.getPending((pending) => {
      const pipelineId = PipelineViewTracker.getPipelineIdFromUrl();

      if (pending) {
        // Check if this pending pipeline is "fresh" (e.g. within last 120 seconds) 
        const now = Date.now();
        if (now - pending.timestamp < 120000 && pending.projectPath === PipelineViewTracker.getProjectPath()) {
          console.log('GitLab Pipeline Tracker: Found matching pending pipeline data');
          PipelineRepository.addPipeline({
            id: pipelineId,
            projectPath: pending.projectPath,
            branch: pending.branch,
            variables: pending.variables,
            label: pending.label,
            startTime: pending.timestamp,
            status: 'running',
            url: window.location.href
          }, () => {
            console.log('GitLab Pipeline Tracker: Saved new pipeline to history');
            PipelineViewTracker.displayPipelineInfo(pipelineId);
          });

          PipelineRepository.clearPending();
        }
      }

      // 2. Start tracking status changes/display info
      PipelineViewTracker.displayPipelineInfo(pipelineId);
      PipelineViewTracker.trackStatus(pipelineId);
    });
  },

  getPipelineIdFromUrl: () => {
    const match = window.location.pathname.match(/\/pipelines\/(\d+)$/);
    return match ? match[1] : null;
  },

  getProjectPath: () => {
    const parts = window.location.pathname.split('/-/');
    if (parts.length > 0) {
      return parts[0].substring(1);
    }
    return 'unknown';
  },

  trackStatus: (id) => {
    const check = () => {
      const statusEl = document.querySelector(TRACKER_SELECTORS.pipelineStatus);
      if (statusEl) {
        const status = statusEl.innerText.trim();
        PipelineRepository.updateStatus(id, status);
      }
    };

    // Poll every 5 seconds
    setInterval(check, 5000);
    check();
  },

  displayPipelineInfo: (id) => {
    PipelineRepository.getHistory((history) => {
      const entry = history.find(p => p.id.toString() === id.toString());
      if (entry) {
        PipelineViewTracker.renderVariableWidget(entry);
        PipelineViewTracker.renderLabelUnderTitle(entry);
      } else {
        PipelineViewTracker.renderTrackPipelineButton(id);
      }
    });
  },

  renderTrackPipelineButton: (id) => {
    if (document.getElementById('gitlab-pipeline-tracker-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'gitlab-pipeline-tracker-btn';
    btn.className = 'btn gl-button btn-confirm btn-md';
    btn.style.marginLeft = '8px';
    btn.innerHTML = '<span class="gl-button-text">Track in History</span>';

    Utils.waitForElement(TRACKER_SELECTORS.pageHeading, (heading) => {
      if (document.getElementById('gitlab-pipeline-tracker-btn')) return;

      const actions = document.querySelector(TRACKER_SELECTORS.pageHeadingActions);
      if (actions) {
        actions.appendChild(btn);
      } else {
        heading.appendChild(btn);
      }
    });

    btn.onclick = () => {
      PipelineViewTracker.trackCurrentPipeline(id);
      btn.remove();
    };
  },

  trackCurrentPipeline: (id) => {
    const branchRef = document.querySelector(TRACKER_SELECTORS.pipelineRef);
    const branch = branchRef ? branchRef.innerText.trim() : 'unknown';
    const statusEl = document.querySelector(TRACKER_SELECTORS.pipelineStatus);
    const status = statusEl ? statusEl.innerText.trim() : 'unknown';

    const entry = {
      id: id,
      projectPath: PipelineViewTracker.getProjectPath(),
      branch: branch,
      variables: [],
      label: '',
      startTime: Date.now(),
      status: status,
      url: window.location.href
    };

    PipelineRepository.addPipeline(entry, () => {
      console.log('GitLab Pipeline Tracker: Manually tracked pipeline');
      PipelineViewTracker.renderVariableWidget(entry);
    });
  },

  renderVariableWidget: (entry) => {
    if (document.getElementById('gitlab-pipeline-tracker-widget')) return;

    const widget = document.createElement('div');
    widget.id = 'gitlab-pipeline-tracker-widget';
    widget.className = 'gl-card';
    widget.style.cssText = `
          margin: 16px 0;
          border: 1px solid #e5e5e5;
          border-radius: 4px;
          background: var(--gl-surface-color, #fff);
      `;
    if (document.body.classList.contains('gl-dark')) {
      widget.style.borderColor = '#303030';
    }

    const header = document.createElement('div');
    header.className = 'gl-card-header gl-py-3 gl-flex gl-justify-between gl-items-center';

    const titleContainer = document.createElement('div');
    titleContainer.innerHTML = '<h3 class="gl-card-title gl-m-0 gl-text-base">Pipeline Parameters Tracker</h3>';

    const labelInput = document.createElement('input');
    labelInput.type = 'text';
    labelInput.className = 'form-control gl-form-input gl-ml-3';
    labelInput.style.cssText = 'width: 200px; padding: 4px 8px; font-size: 13px; height: 28px;';
    labelInput.placeholder = 'Add label...';
    labelInput.value = entry.label || '';

    labelInput.addEventListener('change', (e) => {
      PipelineRepository.updateLabel(entry.id, e.target.value.trim(), () => {
        console.log('Label updated');
      });
    });

    header.appendChild(titleContainer);
    header.appendChild(labelInput);

    const body = document.createElement('div');
    body.className = 'gl-card-body';

    if (entry.variables && entry.variables.length > 0) {
      const table = document.createElement('table');
      table.className = 'gl-table';
      table.innerHTML = `
            <thead>
                <tr>
                    <th>Variable</th>
                    <th>Value</th>
                </tr>
            </thead>
            <tbody>
                ${entry.variables.map(v => `
                    <tr>
                        <td class="gl-font-bold">${Utils.escapeHtml(v.key)}</td>
                        <td class="gl-text-break-word font-monospace">${Utils.escapeHtml(v.value)}</td>
                    </tr>
                `).join('')}
            </tbody>
          `;
      body.appendChild(table);
    } else {
      body.innerHTML = '<p class="gl-text-secondary">No custom variables recorded for this pipeline.</p>';
    }

    widget.appendChild(header);
    widget.appendChild(body);

    const container = document.querySelector('.content');
    if (container) {
      container.appendChild(widget);
    } else {
      document.body.appendChild(widget);
    }
  },

  renderLabelUnderTitle: (entry) => {
    if (!entry.label) return;
    if (document.getElementById('pipeline-tracker-header-label')) return;

    Utils.waitForElement('[data-testid="pipeline-title"]', (title) => {
      const labelEl = document.createElement('div');
      labelEl.id = 'pipeline-tracker-header-label';
      labelEl.innerText = entry.label;
      labelEl.style.color = '#e6ac00';
      labelEl.style.fontSize = '14px';
      labelEl.style.marginTop = '4px';
      labelEl.style.fontWeight = 'bold';

      title.parentNode.insertBefore(labelEl, title.nextSibling);
    });
  }
};
