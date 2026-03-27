const InfoBannerRenderer = {
  render: (containerId, title, itemsHtml) => {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="display: flex; justify-content: flex-end; width: 100%;">
        <div class="info-intro-banner" style="margin: 0px 16px 0 16px; display: inline-flex; position: relative;">
          <div class="info-intro-header" style="display: flex; gap: 6px; align-items: center; cursor: default; color: var(--gl-text-secondary); opacity: 0.8; transition: opacity 0.2s;">
            <span style="font-size: 12px; font-weight: 500;">${Utils.escapeHtml(title)}</span>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
              <path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8zm8.5-1.5a.5.5 0 0 0-1 0v4a.5.5 0 0 0 1 0v-4zm-.5-2.25a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5z"/>
            </svg>
          </div>
          <div class="info-intro-popover" style="position: absolute; top: calc(100% + 4px); right: 0; background-color: #292929; border: 1px solid var(--gl-border-color); border-radius: 4px; padding: 12px; width: 320px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); z-index: 1000; display: none; color: var(--gl-text-color);">
          <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: var(--gl-text-secondary); line-height: 1.5;">
            ${itemsHtml}
          </ul>
        </div>
      </div>
    `;
  }
};
