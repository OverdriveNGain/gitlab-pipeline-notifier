const DashboardRenderer = {
  renderList: (pipelines, containerId = 'pipelineList', onLabelChange, onDelete) => {
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
      li.innerHTML = DashboardRenderer.createPipelineItemHTML(pipeline);
      container.appendChild(li);
    });

    // Add listeners for label inputs
    DashboardRenderer.attachLabelListeners(onLabelChange);

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
  },

  createPipelineItemHTML: (pipeline) => {
    const timeString = Utils.formatDate(pipeline.startTime);
    const statusClass = `status-${(pipeline.status || 'unknown').toLowerCase()}`;
    const statusBadge = `<span class="status-badge ${statusClass}">${pipeline.status || 'Unknown'}</span>`;

    // Variables Section
    let varsHtml = '';
    if (pipeline.variables && pipeline.variables.length > 0) {
      varsHtml = DashboardRenderer.createVariablesHTML(pipeline.variables);
    }

    return `
      <div class="pipeline-header">
          <div style="display:flex; flex-direction:column; gap:4px;">
              <div style="display:flex; justify-content:space-between; align-items:start;">
                  <div>
                      <a href="${pipeline.url}" target="_blank" class="pipeline-id">#${pipeline.id}</a>
                      <span class="pipeline-time">${timeString}</span>
                  </div>
                  <button class="delete-btn" data-id="${pipeline.id}" title="Remove from history">
                      <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                          <path fill-rule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                      </svg>
                  </button>
              </div>
              <input type="text" 
                     class="pipeline-label-input form-input" 
                     value="${Utils.escapeHtml(pipeline.label || '')}" 
                     placeholder="Add a label..." 
                     data-id="${pipeline.id}"
                     style="font-size:12px; padding:2px 6px; width:100%; border:none; background:transparent; color:#e6ac00; font-weight:bold; border-bottom:1px dashed var(--gl-border-color);"
              >
          </div>
      </div>
      <div class="pipeline-ref">
          <span style="display:flex;align-items:center;">
              <svg viewBox="0 0 16 16" class="ref-icon" style="margin-right:4px;">
                  <path d="M10 2.5a.5.5 0 0 0-1 0V4H6a.5.5 0 0 0 0 1h3a.5.5 0 0 0 .5-.5V2.5z"/>
                  <path d="M7.75 6.5a1.25 1.25 0 1 1 2.5 0 1.25 1.25 0 0 1-2.5 0z"/>
              </svg>
              ${pipeline.branch && pipeline.branch !== 'unknown' ? Utils.escapeHtml(pipeline.branch) : '<span style="opacity:0.5; font-style:italic;">Unknown Ref</span>'}
          </span>
          ${statusBadge}
      </div>
      ${varsHtml}
    `;
  },

  createVariablesHTML: (variables) => {
    const filledVars = variables.filter(v => v.value && v.value.trim() !== '');
    const emptyVars = variables.filter(v => !v.value || v.value.trim() === '');

    let varsHtml = '<div class="pipeline-variables">';

    // Render filled variables
    filledVars.forEach(v => {
      varsHtml += `
            <div class="variable-row">
                <span class="variable-key">${Utils.escapeHtml(v.key)}:</span>
                <span class="variable-value">${Utils.escapeHtml(v.value)}</span>
            </div>
        `;
    });

    // Render empty variables in a dropdown
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

    varsHtml += '</div>';
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
  }
};
