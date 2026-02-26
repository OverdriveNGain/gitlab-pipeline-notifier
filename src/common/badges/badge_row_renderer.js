const BadgeRowRenderer = {
  createRowHTML: (pipeline) => {
    let customBadgesHtml = '';
    if (pipeline.badges && pipeline.badges.length > 0) {
      customBadgesHtml = pipeline.badges.map((badge, index) => {
        return BadgeUtils.createBadgeHTML(badge, index, pipeline.id, true);
      }).join('');
    } else {
      customBadgesHtml = '<span style="color:#bfbfbf; font-style:italic; font-size:11px; margin-right:4px; opacity: 0.6;">No custom badges</span>';
    }

    const addBadgeBtn = `<button class="badge-add-btn" data-id="${pipeline.id}" title="Add Badge">+</button>`;

    let copyBadgeBtn = '';
    if (pipeline.badges && pipeline.badges.length > 0) {
      copyBadgeBtn = `<button class="badge-copy-btn" data-id="${pipeline.id}" title="Copy all badges"><span style="margin-right:2px;">📋</span>Copy</button>`;
    }

    return `
      <div class="pipeline-badges" data-id="${pipeline.id}" style="display:flex; flex-wrap:wrap; align-items:center; margin-top:2px; margin-bottom:8px; row-gap:4px; column-gap:4px;">
        ${customBadgesHtml}
        ${addBadgeBtn}
        ${copyBadgeBtn}
      </div>
    `;
  },

  attachListeners: (container, onUpdate) => {
    const closePopovers = () => {
      document.querySelectorAll('.badge-popover').forEach(el => el.remove());
    };

    container.querySelectorAll('.badge-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        closePopovers();

        const pipelineId = btn.getAttribute('data-id');
        BadgeRenderer.showBadgePopover(btn, pipelineId, null, null, onUpdate);
      });
    });

    container.querySelectorAll('.badge-copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        const pipelineId = btn.getAttribute('data-id');

        PipelineRepository.getHistory((history) => {
          const pipeline = history.find(p => p.id.toString() === pipelineId.toString());
          if (pipeline && pipeline.badges && pipeline.badges.length > 0) {
            const textToCopy = pipeline.badges.map(b => {
              return (b.emoji ? b.emoji + ' ' : '') + b.text;
            }).join('\n');

            Utils.copyToClipboard(textToCopy).then(() => {
              const originalText = btn.innerHTML;
              btn.innerHTML = 'Copied!';
              setTimeout(() => btn.innerHTML = originalText, 2000);
            });
          }
        });
      });
    });

    container.querySelectorAll('.custom-badge').forEach(badge => {
      badge.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        closePopovers();

        const pipelineId = badge.getAttribute('data-id');
        const badgeIndex = parseInt(badge.getAttribute('data-index'));

        PipelineRepository.getHistory((history) => {
          const pipeline = history.find(p => p.id.toString() === pipelineId.toString());
          if (pipeline && pipeline.badges && pipeline.badges[badgeIndex]) {
            BadgeRenderer.showBadgePopover(badge, pipelineId, pipeline.badges[badgeIndex], badgeIndex, onUpdate);
          }
        });
      });
    });
  }
};
