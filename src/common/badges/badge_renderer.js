const BadgeRenderer = {
  showBadgePopover: (targetEl, pipelineId, existingBadge, badgeIndex = null, onUpdate) => {
    // Remove existing
    document.querySelectorAll('.badge-popover').forEach(el => el.remove());

    const popover = document.createElement('div');
    popover.className = 'badge-popover';

    // Inline styles for content script usage where dashboard.css might not be present
    // We can rely on classes if we inject CSS, but to be safe/portable:
    popover.style.cssText = `
        position: absolute;
        background-color: #292929;
        border: 1px solid #434344;
        border-radius: 4px;
        padding: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        z-index: 10000;
        width: 200px;
    `;

    // Positioning
    const rect = targetEl.getBoundingClientRect();
    popover.style.top = (rect.bottom + window.scrollY + 5) + 'px';
    popover.style.left = (rect.left + window.scrollX) + 'px';

    if (rect.left + 200 > window.innerWidth) {
      popover.style.left = (window.innerWidth - 210) + 'px';
    }

    const emojiValue = existingBadge ? (existingBadge.emoji || '') : '';
    const textValue = existingBadge ? existingBadge.text : '';

    popover.innerHTML = `
      <style>
        .badge-popover-input {
            width: 100%; box-sizing: border-box; margin-bottom: 8px;
            background-color: #18171d; border: 1px solid #434344; color: #ececef;
            padding: 6px; border-radius: 4px; font-size: 13px;
        }
        .badge-emoji-group { display: flex; gap: 8px; margin-bottom: 8px; }
        .badge-emoji-btn {
            background: none; border: 1px solid #434344; border-radius: 4px; padding: 4px;
            cursor: pointer; font-size: 16px; flex: 1; text-align: center; color: #ececef;
        }
        .badge-emoji-btn:hover { background-color: rgba(255,255,255,0.1); }
        .badge-actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 8px; }
      </style>
      <input type="text" class="badge-popover-input" id="badge-text" placeholder="Badge Text" value="${Utils.escapeHtml(textValue)}">
      <div class="badge-emoji-group">
        ${BadgeTemplates.map(t => `<button class="badge-emoji-btn" data-emoji="${t.emoji}">${t.emoji}</button>`).join('')}
        <button class="badge-emoji-btn" data-emoji="" style="font-size:12px">None</button>
      </div>
      <input type="text" class="badge-popover-input" id="badge-emoji-custom" placeholder="Custom Emoji" value="${Utils.escapeHtml(emojiValue)}" maxlength="2">
      <div class="badge-actions">
        ${existingBadge ? '<button class="btn btn-danger btn-sm" id="badge-delete" style="background:rgba(221,43,14,0.1);color:#ec5941;border:1px solid rgba(221,43,14,0.3);padding:4px 8px;cursor:pointer;">Delete</button>' : ''}
        <button class="btn btn-primary btn-sm" id="badge-save" style="background:#6b4fbb;color:#fff;border:none;padding:4px 8px;cursor:pointer;">Save</button>
      </div>
    `;

    document.body.appendChild(popover);

    const emojiInput = popover.querySelector('#badge-emoji-custom');
    const textInput = popover.querySelector('#badge-text');

    // Emoji Button Logic
    popover.querySelectorAll('.badge-emoji-btn').forEach(emojiBtn => {
      emojiBtn.addEventListener('click', () => {
        emojiInput.value = emojiBtn.getAttribute('data-emoji');
      });
    });

    // Close logic
    const close = () => popover.remove();

    // Save Logic
    popover.querySelector('#badge-save').addEventListener('click', () => {
      const newText = textInput.value.trim();
      if (!newText) {
        alert('Badge text cannot be empty');
        return;
      }

      const newBadge = {
        text: newText,
        emoji: emojiInput.value.trim() || null
      };

      PipelineRepository.updatePipeline(pipelineId, (pipeline) => {
        const badges = pipeline.badges ? [...pipeline.badges] : [];
        if (badgeIndex !== null) {
          badges[badgeIndex] = newBadge;
        } else {
          badges.push(newBadge);
        }
        return { badges: badges };
      }, () => {
        if (onUpdate) onUpdate();
        close();
      });
    });

    // Delete Logic
    if (existingBadge) {
      popover.querySelector('#badge-delete').addEventListener('click', () => {
        if (confirm('Delete this badge?')) {
          PipelineRepository.updatePipeline(pipelineId, (pipeline) => {
            const badges = pipeline.badges ? [...pipeline.badges] : [];
            badges.splice(badgeIndex, 1);
            return { badges: badges };
          }, () => {
            if (onUpdate) onUpdate();
            close();
          });
        }
      });
    }

    // Close on outside click
    const outsideClickListener = (e) => {
      if (!popover.contains(e.target) && e.target !== targetEl && !targetEl.contains(e.target)) {
        close();
        document.removeEventListener('click', outsideClickListener);
      }
    };
    setTimeout(() => document.addEventListener('click', outsideClickListener), 0);

    textInput.focus();
  }
};