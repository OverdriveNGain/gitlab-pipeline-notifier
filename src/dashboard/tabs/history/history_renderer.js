const HistoryRenderer = {
  renderList: (pipelines, containerId = 'pipelineList', onLabelChange, onDelete, onRerun) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '';

    if (pipelines.length === 0) {
      container.innerHTML = '<li class="empty-state"><p>No pipelines match your filters.</p></li>';
      return;
    }

    pipelines.forEach(pipeline => {
      const li = document.createElement('li');
      li.className = 'pipeline-item';
      li.innerHTML = HistoryRenderer.createPipelineItemHTML(pipeline);
      container.appendChild(li);
    });

    // Add listeners for label inputs
    HistoryRenderer.attachLabelListeners(onLabelChange);

    // Add listeners for badges
    HistoryRenderer.attachBadgeListeners(onLabelChange);

    // Add listeners for delete buttons
    if (onDelete) {
      container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          if (confirm('Are you sure you want to remove this pipeline from history?')) {
            onDelete(id);
          }
        });
      });
    }

    // Add listeners for rerun buttons
    if (onRerun) {
      container.querySelectorAll('.rerun-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const id = e.currentTarget.getAttribute('data-id');
          onRerun(id);
        });
      });
    }

    // Add listeners for time hovering
    HistoryRenderer.attachTimeListeners(container);
  },

  createPipelineItemHTML: (pipeline) => {
    const humanTime = Utils.getHumanReadableDate(pipeline.startTime);
    const fullTime = Utils.formatDate(pipeline.startTime);
    const statusClass = `status-${(pipeline.status || 'unknown').toLowerCase()}`;
    const statusBadge = `<span class="status-badge ${statusClass}">${pipeline.status || 'Unknown'}</span>`;

    // Custom Badges Row
    const badgesRowHtml = BadgeRowRenderer.createRowHTML(pipeline);

    // Variables Section
    let varsHtml = '';
    if (pipeline.variables && pipeline.variables.length > 0) {
      varsHtml = HistoryRenderer.createVariablesHTML(pipeline.variables);
    }

    let rerunBtnHtml = '';
    if (pipeline.ref) {
      rerunBtnHtml = `
                  <button class="rerun-btn" data-id="${pipeline.id}" title="Run pipeline again with same parameters" style="border:none;background:transparent;cursor:pointer;color:var(--gl-text-blue-500, #1f75cb);padding:0;display:flex;align-items:center;">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                          <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                          <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                      </svg>
                  </button>
      `;
    }

    return `
      <div class="pipeline-header">
          <div style="display:flex; justify-content:space-between; align-items:center; width: 100%;">
              <div style="display:flex; align-items:center; flex-wrap:wrap;">
                  <a href="${pipeline.url}" target="_blank" class="pipeline-id">#${pipeline.id}</a>
                  <span class="pipeline-project-name" style="font-size:11px; color:var(--gl-text-secondary); margin-left:6px; font-weight:bold;">${pipeline.projectName || 'Unknown Project'}</span>
              </div>
              <div style="display:flex; align-items:center; gap: 8px;">
                  <span class="pipeline-time" 
                        data-human="${Utils.escapeHtml(humanTime)}" 
                        data-full="${Utils.escapeHtml(fullTime)}">${humanTime}</span>
                  ${rerunBtnHtml}
                  <button class="delete-btn" data-id="${pipeline.id}" title="Remove from history">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                          <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                      </svg>
                  </button>
              </div>
          </div>
          <input type="text" 
                 class="pipeline-label-input form-input" 
                 value="${Utils.escapeHtml(pipeline.label || '')}" 
                 placeholder="Add a label..." 
                 data-id="${pipeline.id}"
                 style="font-size:12px; padding:2px 6px; width:100%; border:none; background:transparent; color:#e6ac00; font-weight:bold; border-bottom:1px dashed var(--gl-border-color); box-sizing: border-box; margin-top:4px;"
          >
      </div>
      <div class="pipeline-ref">
          <span style="display:flex;align-items:center;">
              <style>
                .pipeline-ref a { margin: 0 4px; }
              </style>
              ${pipeline.branch && pipeline.branch !== 'unknown' ? pipeline.branch : '<span style="opacity:0.5; font-style:italic;">Unknown Ref</span>'}
          </span>
          ${statusBadge}
      </div>
      ${badgesRowHtml}
      ${varsHtml}
    `;
  },

  createVariablesHTML: (variables) => {
    const filledVars = variables.filter(v => v.value && v.value.trim() !== '');
    const emptyVars = variables.filter(v => !v.value || v.value.trim() === '');

    if (filledVars.length === 0 && emptyVars.length === 0) return '';

    let varsHtml = `
        <details class="pipeline-variables-details">
            <summary class="pipeline-variables-summary">Recorded Parameters (${variables.length})</summary>
            <div class="pipeline-variables-content">
    `;

    // Render filled variables
    filledVars.forEach(v => {
      varsHtml += `
            <div class="variable-row">
                <span class="variable-key">${Utils.escapeHtml(v.key)}:</span>
                <span class="variable-value">${Utils.escapeHtml(v.value)}</span>
            </div>
        `;
    });

    // Render empty variables in a nested dropdown
    if (emptyVars.length > 0) {
      varsHtml += `
            <details class="empty-vars-dropdown">
                <summary>Empty Parameters (${emptyVars.length})</summary>
                <div class="empty-vars-content">
                    ${emptyVars.map(v => `
                        <div class="variable-row text-muted">
                            <span class="variable-key">${Utils.escapeHtml(v.key)}</span>
                            <span class="variable-value"><em>(empty)</em></span>
                        </div>
                    `).join('')}
                </div>
            </details>
        `;
    }

    varsHtml += `
            </div>
        </details>
    `;
    return varsHtml;
  },

  attachLabelListeners: (onLabelChange) => {
    document.querySelectorAll('.pipeline-label-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = e.target.getAttribute('data-id');
        const newLabel = e.target.value.trim();
        if (onLabelChange) onLabelChange(id, newLabel);
      });

      // UX for focus
      input.addEventListener('focus', (e) => {
        e.target.style.background = 'var(--gl-input-bg)';
        e.target.style.border = '1px solid var(--gl-border-color)';
      });
      input.addEventListener('blur', (e) => {
        e.target.style.background = 'transparent';
        e.target.style.border = 'none';
        e.target.style.borderBottom = '1px dashed var(--gl-border-color)';
      });
    });
  },

  attachBadgeListeners: () => {
    BadgeRowRenderer.attachListeners(document, () => location.reload());
  },

  attachTimeListeners: (container) => {
    container.querySelectorAll('.pipeline-time').forEach(el => {
      el.addEventListener('mouseenter', () => {
        el.innerText = el.getAttribute('data-full');
        el.classList.add('detailed-time');
      });
      el.addEventListener('mouseleave', () => {
        el.innerText = el.getAttribute('data-human');
        el.classList.remove('detailed-time');
      });
    });
  }
};
