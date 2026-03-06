const BadgeTemplates = [
  {
    id: 'apple-gray',
    emoji: '🍎',
    text: '$1',
    theme: 'badge-gray',
    regex: /Successfully finished processing the build (.*?) for IOS/
  },
  {
    id: 'robot-green',
    emoji: '🤖',
    text: '$1',
    theme: 'badge-green',
    regex: /created release (\S+ \(\d+\))/
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
