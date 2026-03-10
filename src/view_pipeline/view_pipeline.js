const PipelineViewTracker = {
  _shouldNotify: false,

  init: () => {
    const pipelineId = PipelineViewTracker.getPipelineIdFromUrl();

    // Check for pending data from New Pipeline page
    PipelineViewTracker.checkPendingPipeline(pipelineId, () => {
      // Start tracking status changes/display info
      PipelineViewTracker.displayPipelineInfo(pipelineId);
      PipelineViewTracker.trackStatus(pipelineId);
    });
  },

  checkPendingPipeline: (id, callback) => {
    PipelineRepository.getPending((pending) => {
      if (pending && (Date.now() - pending.timestamp < 60000) && pending.projectPath === PipelineViewTracker.getProjectPath()) {
        console.log('Found pending pipeline data, linking to ID:', id);

        Utils.waitForElement(TRACKER_SELECTORS.pipelineRef, (branchRef) => {
          let branchHtml = pending.branch || 'unknown';

          if (branchRef) {
            const clone = branchRef.cloneNode(true);
            const origin = window.location.origin;
            clone.querySelectorAll('a').forEach(a => {
              const href = a.getAttribute('href');
              if (href && href.startsWith('/')) {
                a.setAttribute('href', origin + href);
              }
              a.setAttribute('target', '_blank');
            });
            branchHtml = clone.innerHTML;
          }

          const statusEl = document.querySelector(TRACKER_SELECTORS.pipelineStatus);
          const status = statusEl ? statusEl.innerText.trim() : 'Running';

          const entry = {
            id: id,
            projectPath: pending.projectPath,
            projectName: pending.projectName,
            branch: branchHtml,
            ref: pending.ref || pending.branch,
            variables: pending.variables,
            label: pending.label,
            startTime: pending.timestamp,
            status: status,
            url: window.location.href
          };

          PipelineRepository.addPipeline(entry, () => {
            PipelineRepository.clearPending(() => {
              if (callback) callback();
            });
          });
        });
      } else {
        if (callback) callback();
      }
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
    let currentStatus = null;

    const check = async () => {
      let status = null;

      // GitLab's frontend halts UI polling when the tab is out of focus (hidden).
      // We must query the GitLab API directly to detect status changes in the background!
      if (document.hidden) {
        try {
          const projectPath = encodeURIComponent(PipelineViewTracker.getProjectPath());
          const res = await fetch(`${window.location.origin}/api/v4/projects/${projectPath}/pipelines/${id}`);
          if (res.ok) {
            const data = await res.json();
            if (data && data.status) {
              const apiStatus = data.status.toLowerCase();
              // Normalize API syntax to match GitLab UI DOM syntax
              if (apiStatus === 'success') {
                status = 'Passed';
              } else {
                status = apiStatus.charAt(0).toUpperCase() + apiStatus.slice(1);
              }
            }
          }
        } catch (e) {
          console.error('[GitLab Pipeline Notifier] API fetch failed:', e);
        }
      }

      // Fallback to the standard DOM check if visible or API failed
      if (!status) {
        const statusEl = document.querySelector(TRACKER_SELECTORS.pipelineStatus);
        if (statusEl) {
          status = statusEl.innerText.trim();
        }
      }

      if (status) {
        console.log(`[GitLab Pipeline Notifier] Checking status for pipeline #${id}: currentStatus = ${currentStatus}, newStatus = ${status}`);

        if (currentStatus !== null && currentStatus !== status) {
          if (PipelineViewTracker._shouldNotify) {
            try {
              chrome.runtime.sendMessage({
                type: 'PIPELINE_NOTIFICATION',
                title: `Pipeline #${id} Update`,
                body: `Status changed to: ${status}`
              });
            } catch (e) {
              console.error('GitLab Pipeline Notifier: Failed to send notification', e);
            }
          }
        }

        currentStatus = status;
        PipelineRepository.updateStatus(id, status);
      } else {
        console.log(`[GitLab Pipeline Notifier] Checking status for pipeline #${id}: Status not determined yet.`);
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
        const btn = document.getElementById('gitlab-pipeline-tracker-btn');
        if (btn) btn.remove();

        PipelineViewTracker.renderVariableWidget(entry);
        PipelineViewTracker.renderLabelUnderTitle(entry);
        PipelineViewTracker.checkLinkedPipelinesMapping(id, history, true);
        PipelineViewTracker._shouldNotify = true;
        PipelineViewTracker.showFloatingNotificationStatus(id, 'TRACKED');
        PipelineRepository.removeNotifyOnlyPipeline(id); // Cleanup if explicitly tracked
      } else {
        PipelineRepository.getNotifyOnlyPipelines((notifyMap) => {
          PipelineViewTracker.renderTrackPipelineButton(id);
          PipelineViewTracker.checkLinkedPipelinesMapping(id, history, false);

          if (notifyMap[id]) {
            PipelineViewTracker._shouldNotify = true;
            PipelineViewTracker.showFloatingNotificationStatus(id, 'NOTIFY_ONLY');
          } else {
            PipelineViewTracker._shouldNotify = false;
            PipelineViewTracker.showFloatingNotificationStatus(id, 'UNTRACKED');
          }
        });
      }
    });
  },

  showFloatingNotificationStatus: (id, state) => {
    let container = document.getElementById('gl-pipeline-notifier-status');
    if (!container) {
      container = document.createElement('div');
      container.id = 'gl-pipeline-notifier-status';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none;
      `;
      document.body.appendChild(container);
    }

    container.innerHTML = ''; // Clear previous if any

    const notif = document.createElement('div');
    notif.style.cssText = `
      pointer-events: auto;
      background-color: var(--gl-surface-color, #ffffff);
      border: 1px solid var(--gl-border-color, #dbd7e6);
      border-radius: 4px;
      padding: 12px 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      animation: jobLogSlideIn 0.3s ease-out;
      color: var(--gl-text-color, #333238);
      font-size: 14px;
    `;

    if (!document.getElementById('jobLogAnimations')) {
      const style = document.createElement('style');
      style.id = 'jobLogAnimations';
      style.innerHTML = `
        @keyframes jobLogSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    if (state === 'TRACKED') {
      notif.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; width: 24px; height: 24px; background: rgba(16,133,72,0.1); border-radius: 50%; color: #108548;">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M14.207 4.293a1 1 0 0 0-1.414-1.414L6.5 9.172 3.707 6.379a1 1 0 1 0-1.414 1.414l3.5 3.5a1 1 0 0 0 1.414 0l7-7z"/>
          </svg>
        </div>
        <div>
          <strong>Notifying on Status Change</strong> <span style="cursor: pointer; color: var(--gl-text-color-secondary, #737278); text-decoration: underline; font-size: 12px; margin-left: 4px;" class="test-notify-btn" title="Send test notification">(Test Notification)</span><br/>
          <span style="font-size: 12px; color: var(--gl-text-color-secondary, #737278);">A notification will be sent upon tracked pipeline status change</span>
        </div>
      `;
    } else if (state === 'NOTIFY_ONLY') {
      notif.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; width: 24px; height: 24px; background: rgba(16,133,72,0.1); border-radius: 50%; color: #108548;">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M14.207 4.293a1 1 0 0 0-1.414-1.414L6.5 9.172 3.707 6.379a1 1 0 1 0-1.414 1.414l3.5 3.5a1 1 0 0 0 1.414 0l7-7z"/>
          </svg>
        </div>
        <div>
          <strong>Notifying on Status Change</strong> <span style="cursor: pointer; color: var(--gl-text-color-secondary, #737278); text-decoration: underline; font-size: 12px; margin-left: 4px;" class="test-notify-btn" title="Send test notification">(Test Notification)</span><br/>
          <span style="font-size: 12px; color: var(--gl-text-color-secondary, #737278);">A notification will be sent upon untracked pipeline status change</span>
        </div>
      `;
    } else {
      notif.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:center; width: 24px; height: 24px; background: rgba(115,114,120,0.1); border-radius: 50%; color: #737278;">
          <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
            <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8z" clip-rule="evenodd" fill-rule="evenodd"/>
            <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3.5a.5.5 0 0 1-.5-.5v-4A.5.5 0 0 1 8 4z"/>
          </svg>
        </div>
        <div style="cursor: pointer;" class="notify-click-target">
          <strong>Not Tracking Status</strong><br/>
          <span style="font-size: 12px; color: var(--gl-text-blue-500, #1f75cb); text-decoration: underline;">Notify me on status change</span>
        </div>
      `;

      notif.querySelector('.notify-click-target').addEventListener('click', () => {
        PipelineViewTracker._shouldNotify = true;
        PipelineViewTracker.showFloatingNotificationStatus(id, 'NOTIFY_ONLY');
        PipelineRepository.addNotifyOnlyPipeline(id);
      });
    }

    const testBtn = notif.querySelector('.test-notify-btn');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        try {
          chrome.runtime.sendMessage({
            type: 'PIPELINE_NOTIFICATION',
            title: `Pipeline #${id} Test notification`,
            body: 'Focus test triggered successfully!'
          });
        } catch (e) {
          console.error('GitLab Pipeline Notifier: Failed to send test notification', e);
        }
      });
    }

    container.appendChild(notif);
  },

  checkLinkedPipelinesMapping: (id, history, isCurrentPipelineTracked) => {
    PipelineRepository.getPipelineMapping((mapping) => {
      if (!isCurrentPipelineTracked && mapping[id]) {
        const parentId = mapping[id];
        const parentPipeline = history.find(p => p.id && p.id.toString() === parentId);
        if (parentPipeline) {
          // Intentional removal to avoid bugs for now
          const btn = document.getElementById('gitlab-pipeline-tracker-btn');
          if (btn) btn.remove();

          PipelineViewTracker.renderLabelUnderTitle(parentPipeline, true);
          PipelineViewTracker.renderTriggeredByText(parentId, history);
          return;
        }
      }

      let hasProcessedUpstream = false;
      let hasProcessedDownstream = false;

      const checkLinkedUI = () => {
        const titles = document.querySelectorAll('[data-testid="linked-column-title"]');

        for (const t of titles) {
          const titleText = t.innerText.trim();

          if (!isCurrentPipelineTracked && !hasProcessedUpstream && titleText === 'Upstream') {
            const column = t.closest('.linked-pipelines-column');
            if (column) {
              const pipelineLink = column.querySelector('a[data-testid="pipelineLink"]');
              if (pipelineLink) {
                const parentIdText = pipelineLink.innerText.trim();
                if (parentIdText.startsWith('#')) {
                  const parentId = parentIdText.substring(1);
                  const parentPipeline = history.find(p => p.id && p.id.toString() === parentId);
                  if (parentPipeline) {
                    const btn = document.getElementById('gitlab-pipeline-tracker-btn');
                    if (btn) btn.remove();

                    console.log(`PipelineViewTracker: Mapping downstream pipeline ${id} to tracked upstream pipeline ${parentId}`);
                    PipelineRepository.addPipelineMapping(id, parentId);
                    PipelineViewTracker.renderLabelUnderTitle(parentPipeline, true);
                    PipelineViewTracker.renderTriggeredByText(parentId, history);

                    hasProcessedUpstream = true;
                  }
                }
              }
            }
          }

          if (isCurrentPipelineTracked && !hasProcessedDownstream && titleText === 'Downstream') {
            const column = t.closest('.linked-pipelines-column');
            if (column) {
              const pipelineLinks = column.querySelectorAll('a[data-testid="pipelineLink"]');
              if (pipelineLinks.length > 0) {
                pipelineLinks.forEach(link => {
                  const childIdText = link.innerText.trim();
                  if (childIdText.startsWith('#')) {
                    const childId = childIdText.substring(1);
                    if (mapping[childId] !== id) {
                      console.log(`PipelineViewTracker: Mapping downstream pipeline ${childId} to tracked parent pipeline ${id}`);
                      PipelineRepository.addPipelineMapping(childId, id);
                      mapping[childId] = id; // update in memory locally to prevent redundancy
                    }
                  }
                });
                hasProcessedDownstream = true;
              }
            }
          }
        }

        return (isCurrentPipelineTracked ? hasProcessedDownstream : true) && (!isCurrentPipelineTracked ? hasProcessedUpstream : true);
      };

      // Perform an initial check
      checkLinkedUI();

      const observer = new MutationObserver((mutations, obs) => {
        // We evaluate continuously until the observer timeout
        checkLinkedUI();
      });

      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => observer.disconnect(), 10000);
    });
  },

  renderTriggeredByText: (parentId, history) => {
    if (document.getElementById('pipeline-tracker-downstream-label')) return;

    Utils.waitForElement('[data-testid="pipeline-title"]', (title) => {
      if (document.getElementById('pipeline-tracker-downstream-label')) return;

      const parentPipeline = history.find(p => p.id && p.id.toString() === parentId);
      const parentUrl = parentPipeline && parentPipeline.url ? parentPipeline.url : '#';

      const container = document.createElement('div');
      container.id = 'pipeline-tracker-downstream-label';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.marginTop = '4px';

      const labelEl = document.createElement('span');
      labelEl.innerHTML = `Triggered by tracked pipeline <span class="pipeline-tracker-parent-link" style="color: #00bcd4; text-decoration: underline; cursor: pointer;">#${parentId}</span>`;
      labelEl.style.color = '#00bcd4';
      labelEl.style.fontSize = '14px';
      labelEl.style.fontWeight = 'bold';
      labelEl.style.marginRight = '8px';
      labelEl.style.fontStyle = 'italic';

      const parentLink = labelEl.querySelector('.pipeline-tracker-parent-link');
      if (parentLink) {
        parentLink.addEventListener('click', (e) => {
          e.preventDefault();
          window.open(parentUrl, '_blank');
        });
      }

      container.appendChild(labelEl);
      title.parentNode.insertBefore(container, title.nextSibling);
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
    // Capture the HTML content of the related merge request/commit info
    const branchRef = document.querySelector(TRACKER_SELECTORS.pipelineRef);
    let branchHtml = 'unknown';

    if (branchRef) {
      // Clone the node to manipulate links without changing the DOM
      const clone = branchRef.cloneNode(true);
      // Ensure links are absolute or handled correctly if needed, 
      // but for now keeping them as relative is fine if the base URL is correct.
      // However, in the popup, relative links might break. 
      // Let's prepend the origin to all hrefs if they are relative.
      const origin = window.location.origin;
      clone.querySelectorAll('a').forEach(a => {
        const href = a.getAttribute('href');
        if (href && href.startsWith('/')) {
          a.setAttribute('href', origin + href);
        }
        a.setAttribute('target', '_blank'); // Open in new tab
      });
      branchHtml = clone.innerHTML;
    }

    const statusEl = document.querySelector(TRACKER_SELECTORS.pipelineStatus);
    const status = statusEl ? statusEl.innerText.trim() : 'unknown';

    const entry = {
      id: id,
      projectPath: PipelineViewTracker.getProjectPath(),
      branch: branchHtml, // Storing HTML now
      variables: [],
      label: '',
      startTime: Date.now(),
      status: status,
      url: window.location.href
    };

    PipelineRepository.addPipeline(entry, () => {
      console.log('GitLab Pipeline Tracker: Manually tracked pipeline');
      PipelineRepository.removeNotifyOnlyPipeline(id);
      PipelineViewTracker.renderVariableWidget(entry);
      PipelineViewTracker.renderLabelUnderTitle(entry);
      PipelineViewTracker._shouldNotify = true;
      PipelineViewTracker.showFloatingNotificationStatus(id, 'TRACKED');
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

    header.appendChild(titleContainer);

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

  renderLabelUnderTitle: (entry, isDownstream = false) => {
    // Allows empty label now so we can show "Add Label"
    if (document.getElementById('pipeline-tracker-header-label')) return;

    Utils.waitForElement('[data-testid="pipeline-title"]', (title) => {
      const container = document.createElement('div');
      container.id = 'pipeline-tracker-header-label';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.marginTop = '4px';
      if (isDownstream) {
        container.style.opacity = '0.5';
      }

      const labelEl = document.createElement('span');
      labelEl.innerText = entry.label || 'Add Label';
      labelEl.style.color = entry.label ? '#e6ac00' : 'var(--gl-text-secondary)';
      labelEl.style.fontSize = '14px';
      labelEl.style.fontWeight = 'bold';
      labelEl.style.marginRight = '8px';
      if (!entry.label) labelEl.style.fontStyle = 'italic';

      const editBtn = document.createElement('button');
      editBtn.innerText = '(Edit)';
      editBtn.className = 'btn btn-default btn-sm';
      editBtn.style.padding = '2px 6px';
      editBtn.style.fontSize = '12px';
      editBtn.style.border = 'none';
      editBtn.style.background = 'transparent';
      editBtn.style.color = 'var(--gl-text-blue-500)';
      editBtn.style.cursor = 'pointer';

      // Input for editing (hidden initially)
      const inputEl = document.createElement('input');
      inputEl.type = 'text';
      inputEl.className = 'form-control gl-form-input';
      inputEl.style.display = 'none';
      inputEl.style.width = '300px';
      inputEl.style.height = '24px';
      inputEl.style.fontSize = '13px';
      inputEl.value = entry.label || '';

      // Edit Mode
      editBtn.onclick = () => {
        labelEl.style.display = 'none';
        editBtn.style.display = 'none';
        inputEl.style.display = 'block';
        inputEl.focus();
      };

      // Save / Cancel
      const saveLabel = () => {
        const newLabel = inputEl.value.trim();
        PipelineRepository.updateLabel(entry.id, newLabel, () => {
          entry.label = newLabel;
          labelEl.innerText = newLabel || 'Add Label';
          labelEl.style.color = newLabel ? '#e6ac00' : 'var(--gl-text-secondary)';
          labelEl.style.display = 'block';
          if (!newLabel) labelEl.style.fontStyle = 'italic';
          else labelEl.style.fontStyle = 'normal';

          editBtn.style.display = 'block';
          inputEl.style.display = 'none';
        });
      };

      inputEl.addEventListener('blur', saveLabel);
      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          saveLabel();
        }
      });

      container.appendChild(labelEl);
      container.appendChild(editBtn);
      container.appendChild(inputEl);

      title.parentNode.insertBefore(container, title.nextSibling);

      // Render Custom Badges (Interactive)
      const badgesContainer = document.createElement('div');
      badgesContainer.id = 'pipeline-badges-container-' + entry.id;
      badgesContainer.style.display = 'flex';
      badgesContainer.style.flexWrap = 'wrap';
      badgesContainer.style.marginTop = '4px';
      badgesContainer.style.gap = '4px';
      if (isDownstream) {
        badgesContainer.style.opacity = '0.5';
      }

      const renderBadges = () => {
        badgesContainer.innerHTML = BadgeRowRenderer.createRowHTML(entry);
        BadgeRowRenderer.attachListeners(badgesContainer, () => location.reload());
      };

      renderBadges();
      title.parentNode.insertBefore(badgesContainer, container.nextSibling);

    });
  }
};
