const BadgeUtils = {
  getTheme: (emoji) => {
    switch (emoji) {
      case '🍎': return 'badge-gray';
      case '🤖': return 'badge-green';
      case '🪽': return 'badge-blue';
      default: return 'badge-beige';
    }
  },

  createBadgeHTML: (badge, index, pipelineId, isEditable = true) => {
    const theme = BadgeUtils.getTheme(badge.emoji);
    const emojiHtml = badge.emoji ? `<span style="margin-right:4px;">${badge.emoji}</span>` : '';
    const editableAttrs = isEditable ? `data-id="${pipelineId}" data-index="${index}"` : '';
    const cursorClass = isEditable ? 'cursor-pointer' : 'cursor-default';

    return `<span class="custom-badge ${theme} ${cursorClass}" ${editableAttrs}>${emojiHtml}${Utils.escapeHtml(badge.text)}</span>`;
  }
};