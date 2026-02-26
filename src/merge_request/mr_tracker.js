const MergeRequestTracker = {
  init: () => {
    Utils.waitForElement(MR_SELECTORS.title, (titleEl) => {
      MergeRequestTracker.injectCopyHint(titleEl);
      MergeRequestTracker.attachKeyListener();
    });
  },

  injectCopyHint: (titleEl) => {
    if (document.getElementById('mr-copy-hint')) return;

    const hint = document.createElement('span');
    hint.id = 'mr-copy-hint';
    hint.innerText = 'Press H to copy MR title';
    hint.style.cssText = `
      font-size: 12px;
      color: var(--gl-text-secondary, #737278);
      background-color: var(--gl-surface-color, #ffffff);
      border: 1px solid var(--gl-border-color, #dbd7e6);
      border-radius: 4px;
      padding: 2px 6px;
      margin-left: 12px;
      vertical-align: middle;
      cursor: pointer;
      font-weight: normal;
      display: inline-block;
    `;
    hint.title = "Click or press H to copy";

    hint.addEventListener('click', MergeRequestTracker.copyMRTitle);

    titleEl.appendChild(hint);
  },

  attachKeyListener: () => {
    document.addEventListener('keydown', (e) => {
      if (e.key.toLowerCase() === 'h' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const activeTagName = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
        if (activeTagName !== 'input' && activeTagName !== 'textarea' && !document.activeElement.isContentEditable) {
          e.preventDefault();
          MergeRequestTracker.copyMRTitle();
        }
      }
    });
  },

  copyMRTitle: () => {
    const titleEl = document.querySelector(MR_SELECTORS.title);
    if (!titleEl) return;

    // Clone to remove the hint element from text extraction
    const clone = titleEl.cloneNode(true);
    const hint = clone.querySelector('#mr-copy-hint');
    if (hint) hint.remove();

    // Clean up "Draft:", "WIP:", "Resolved:", etc. from the actual DOM nodes
    for (let node of clone.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        let text = node.nodeValue;
        if (/^(?:\s*)(?:Draft|WIP|Draft \/ WIP|Resolved):\s*/i.test(text)) {
          node.nodeValue = text.replace(/^(?:\s*)(?:Draft|WIP|Draft \/ WIP|Resolved):\s*/i, '');
          break; // Stop after fixing the first text node prefix
        } else if (text.trim().length > 0) {
          break; // Non-matching text node found, no prefix to remove
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        break; // Cannot be a prefix if an element comes first
      }
    }

    // Make relative links absolute
    clone.querySelectorAll('a').forEach(a => {
      a.href = a.href;
    });

    let rawText = clone.innerText || clone.textContent;
    rawText = rawText.replace(/\s+/g, ' ').trim();

    // Preserve the original HTML structure so only the parts that are natively links remain links
    const htmlSnippet = clone.innerHTML.trim();

    // Copy to clipboard
    try {
      const clipboardItem = new ClipboardItem({
        'text/plain': new Blob([rawText], { type: 'text/plain' }),
        'text/html': new Blob([htmlSnippet], { type: 'text/html' })
      });

      navigator.clipboard.write([clipboardItem]).then(() => {
        MergeRequestTracker.showCopiedFeedback();
      }).catch(err => {
        console.error("Failed to copy MR title via ClipboardItem", err);
        MergeRequestTracker.fallbackCopy(rawText);
      });
    } catch (e) {
      console.warn("ClipboardItem not supported or failed", e);
      MergeRequestTracker.fallbackCopy(rawText);
    }
  },

  fallbackCopy: (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      MergeRequestTracker.showCopiedFeedback();
    } catch (err) {
      console.error('Fallback: Oops, unable to copy', err);
    }
    document.body.removeChild(textArea);
  },

  showCopiedFeedback: () => {
    const hintEl = document.getElementById('mr-copy-hint');
    if (hintEl) {
      const originalText = hintEl.getAttribute('data-original-text') || 'Press H to copy MR title';
      if (!hintEl.hasAttribute('data-original-text')) {
        hintEl.setAttribute('data-original-text', hintEl.innerText);
      }

      hintEl.innerText = 'Copied!';
      hintEl.style.color = 'var(--gl-text-green-500, #108548)';
      hintEl.style.borderColor = 'var(--gl-text-green-500, #108548)';

      if (MergeRequestTracker._feedbackTimer) clearTimeout(MergeRequestTracker._feedbackTimer);
      MergeRequestTracker._feedbackTimer = setTimeout(() => {
        hintEl.innerText = originalText;
        hintEl.style.color = 'var(--gl-text-secondary, #737278)';
        hintEl.style.borderColor = 'var(--gl-border-color, #dbd7e6)';
      }, 2000);
    }
  }
};
