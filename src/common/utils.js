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
