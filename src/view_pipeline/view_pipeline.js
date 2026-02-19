const PipelineViewTracker = {
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
        const btn = document.getElementById('gitlab-pipeline-tracker-btn');
        if (btn) btn.remove();

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

  renderLabelUnderTitle: (entry) => {
    // Allows empty label now so we can show "Add Label"
    if (document.getElementById('pipeline-tracker-header-label')) return;

    Utils.waitForElement('[data-testid="pipeline-title"]', (title) => {
      const container = document.createElement('div');
      container.id = 'pipeline-tracker-header-label';
      container.style.display = 'flex';
      container.style.alignItems = 'center';
      container.style.marginTop = '4px';

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

      const renderBadges = () => {
        let html = '';
        if (entry.badges && entry.badges.length > 0) {
          html += entry.badges.map((badge, index) => {
            return BadgeUtils.createBadgeHTML(badge, index, entry.id, true);
          }).join('');
        }

        html += `<button class="badge-add-btn" data-id="${entry.id}" title="Add Badge" style="width:20px;height:20px;border-radius:50%;border:1px dashed #bfbfbf;background:none;color:#bfbfbf;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;font-size:14px;margin-left:4px;">+</button>`;

        if (entry.badges && entry.badges.length > 0) {
          html += `<button class="badge-copy-btn" data-id="${entry.id}" title="Copy all badges"><span style="margin-right:2px;">📋</span>Copy</button>`;
        }

        badgesContainer.innerHTML = html;

        if (!document.getElementById('pipeline-tracker-badge-styles')) {
          const style = document.createElement('style');
          style.id = 'pipeline-tracker-badge-styles';
          style.textContent = `
                .custom-badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600; cursor: pointer; border: 1px solid transparent; user-select: none; }
                .custom-badge:hover { opacity: 0.8; }
                .badge-gray { background-color: #424242; color: #e0e0e0; border-color: #616161; }
                .badge-green { background-color: rgba(16, 133, 72, 0.2); color: #2da160; border-color: rgba(16, 133, 72, 0.3); }
                .badge-blue { background-color: rgba(31, 117, 203, 0.2); color: #428fdc; border-color: rgba(31, 117, 203, 0.3); }
                .badge-beige { background-color: #5c5c4f; color: #e8e8d8; border-color: #828270; }
                .badge-add-btn:hover { border-color: #ececef !important; color: #ececef !important; opacity: 1; }
                .badge-copy-btn { background: none; border: 1px solid #bfbfbf; color: #bfbfbf; border-radius: 4px; padding: 0 6px; height: 20px; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; cursor: pointer; margin-left: 6px; opacity: 0.6; }
                .badge-copy-btn:hover { opacity: 1; border-color: #ececef; color: #ececef; }
            `;
          document.head.appendChild(style);
        }

        badgesContainer.querySelectorAll('.badge-add-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            BadgeRenderer.showBadgePopover(btn, entry.id, null, null, () => location.reload());
          });
        });

        badgesContainer.querySelectorAll('.badge-copy-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.preventDefault();
            const textToCopy = entry.badges.map(b => {
              return (b.emoji ? b.emoji + ' ' : '') + b.text;
            }).join('\n');

            Utils.copyToClipboard(textToCopy).then(() => {
              const originalText = btn.innerHTML;
              btn.innerHTML = 'Copied!';
              setTimeout(() => btn.innerHTML = originalText, 2000);
            });
          });
        });

        badgesContainer.querySelectorAll('.custom-badge').forEach(badge => {
          badge.addEventListener('click', (e) => {
            const index = parseInt(badge.getAttribute('data-index'));
            BadgeRenderer.showBadgePopover(badge, entry.id, entry.badges[index], index, () => location.reload());
          });
        });
      };

      renderBadges();
      title.parentNode.insertBefore(badgesContainer, container.nextSibling);

    });
  }
};
