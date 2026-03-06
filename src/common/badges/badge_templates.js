const BadgeTemplates = [
  {
    id: 'apple-gray',
    emoji: '🍎',
    text: 'Apple',
    theme: 'badge-gray',
    regex: null
  },
  {
    id: 'robot-green',
    emoji: '🤖',
    text: 'Robot',
    theme: 'badge-green',
    regex: null
  },
  {
    id: 'wing-blue',
    emoji: '🪽',
    text: '$1', // Extracted version will replace $1
    theme: 'badge-blue',
    regex: /LOCAL_LIB_VERSION=([0-9][^\s]+)/
  }
];

// If using ES modules in future, or for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BadgeTemplates };
}
