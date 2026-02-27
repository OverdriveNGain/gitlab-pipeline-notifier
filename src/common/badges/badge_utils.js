const BadgeUtils = {
  getTheme: (emoji) => {
    if (!emoji) return 'badge-beige';
    const template = BadgeTemplates.find(t => t.emoji === emoji);
    return template ? template.theme : 'badge-beige';
  },

  createBadgeHTML: (badge, index, pipelineId, isEditable = true) => {
    const theme = BadgeUtils.getTheme(badge.emoji);
    const emojiHtml = badge.emoji ? `<span style="margin-right:4px;">${badge.emoji}</span>` : '';
    const editableAttrs = isEditable ? `data-id="${pipelineId}" data-index="${index}"` : '';
    const cursorClass = isEditable ? 'cursor-pointer' : 'cursor-default';

    return `<span class="custom-badge ${theme} ${cursorClass}" ${editableAttrs}>${emojiHtml}${Utils.escapeHtml(badge.text)}</span>`;
  }
};