const Utils = {
  escapeHtml: (text) => {
    if (!text) return '';
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  },

  formatDate: (timestamp) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  },

  getHumanReadableDate: (timestamp) => {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp);

    // Normalize to midnight for day comparison
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((nowMidnight - dateMidnight) / (1000 * 60 * 60 * 24));

    const timeStr = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    if (diffDays === 0) {
      return `Today, ${timeStr}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${timeStr}`;
    } else if (diffDays <= now.getDay()) {
      return `This Week ${dayNames[date.getDay()]}, ${timeStr}`;
    } else if (diffDays <= now.getDay() + 7) {
      return `Last Week ${dayNames[date.getDay()]}, ${timeStr}`;
    } else {
      return `${monthNames[date.getMonth()]} ${date.getDate()}, ${timeStr}`;
    }
  },

  /**
   * Waits for an element to appear in the DOM
   * @param {string} selector 
   * @param {function} callback 
   */
  waitForElement: (selector, callback) => {
    if (document.querySelector(selector)) {
      callback(document.querySelector(selector));
      return;
    }
    const observer = new MutationObserver((mutations) => {
      if (document.querySelector(selector)) {
        callback(document.querySelector(selector));
        observer.disconnect();
      }
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  },

  copyToClipboard: (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    } else {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
      } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
      }
      document.body.removeChild(textArea);
      return Promise.resolve();
    }
  }
};
