const JobLogTracker = {
  _checkInterval: null,
  _matchedTemplateIds: new Set(),

  init: () => {
    Utils.waitForElement(JOB_LOG_SELECTORS.pipelinePath, (pipelineLinkEl) => {
      const pipelineText = pipelineLinkEl.innerText.trim();
      if (!pipelineText.startsWith('#')) return;

      const pipelineId = pipelineText.substring(1); // remove '#'

      // Check if this pipeline is being tracked
      PipelineRepository.getHistory((history) => {
        const pipeline = history.find(p => p.id && p.id.toString() === pipelineId);
        if (!pipeline) {
          console.log(`JobLogTracker: Pipeline #${pipelineId} is not tracked. Exiting auto-badge check.`);
          return;
        }

        console.log(`JobLogTracker: Pipeline #${pipelineId} is tracked! Starting log observation.`);

        // We want badges to always show in the lower right, so we do not pre-fill _matchedTemplateIds
        // from the repository. We will let checkLogsForBadges scan the current log to find and display them.

        JobLogTracker.startLogObservation(pipelineId);
      });
    });
  },

  startLogObservation: (pipelineId) => {
    // Only look for templates that actually have a regex defined and haven't been matched yet
    const activeTemplates = BadgeTemplates.filter(t => t.regex && !JobLogTracker._matchedTemplateIds.has(t.id));

    if (activeTemplates.length === 0) {
      console.log('JobLogTracker: No active regex templates to match against.');
      return;
    }

    // Since GitLab streams logs, we check periodically
    JobLogTracker._checkInterval = setInterval(() => {
      JobLogTracker.checkLogsForBadges(pipelineId, activeTemplates);
    }, 2000); // Check every 2 seconds
  },

  checkLogsForBadges: (pipelineId, activeTemplates) => {
    const logContainer = document.querySelector(JOB_LOG_SELECTORS.jobLogContent);
    if (!logContainer) return;

    // Use innerText to get the human-readable log content, collapsing HTML tags
    const logText = logContainer.innerText;

    activeTemplates.forEach(template => {
      // If we already matched it in a previous interval step, skip
      if (JobLogTracker._matchedTemplateIds.has(template.id)) return;

      const match = logText.match(template.regex);
      if (match) {
        console.log(`JobLogTracker: Match found for template [${template.id}]!`);
        JobLogTracker._matchedTemplateIds.add(template.id);

        let dynamicText = template.text;
        if (match[1]) {
          dynamicText = dynamicText.includes('$1') ? dynamicText.replace('$1', match[1].trim()) : match[1].trim();
        }

        JobLogTracker.applyBadgeToPipeline(pipelineId, template, dynamicText);
      }
    });

    // Check if job finished (e.g. log container has a specific state, or just keep running until page closes/navigates)
    // For now, we just rely on interval running, as users can stay on the page while it runs
    // If all possible badges matched, clear interval
    if (activeTemplates.every(t => JobLogTracker._matchedTemplateIds.has(t.id))) {
      clearInterval(JobLogTracker._checkInterval);
    }
  },

  applyBadgeToPipeline: (pipelineId, template, badgeText) => {
    const newBadge = {
      text: badgeText,
      emoji: template.emoji || null
    };

    let alreadyExists = false;

    PipelineRepository.updatePipeline(pipelineId, (pipeline) => {
      const badges = pipeline.badges ? [...pipeline.badges] : [];
      // Double check it wasn't added by another tab or run
      alreadyExists = badges.some(b => b.text === newBadge.text && b.emoji === newBadge.emoji);
      if (!alreadyExists) {
        badges.push(newBadge);
      }
      return { badges };
    }, () => {
      JobLogTracker.showFloatingNotification(template, badgeText, alreadyExists);
    });
  },

  showFloatingNotification: (template, badgeText, alreadyExists) => {
    let container = document.getElementById('gl-pipeline-notifier-auto-badges');
    if (!container) {
      container = document.createElement('div');
      container.id = 'gl-pipeline-notifier-auto-badges';
      container.style.cssText = `
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 8px;
        pointer-events: none; /* Let clicks pass through gaps */
      `;
      document.body.appendChild(container);
    }

    const notif = document.createElement('div');
    notif.style.cssText = `
      pointer-events: auto; /* Enable clicks on the notification itself */
      background-color: var(--gl-surface-color, #ffffff);
      border: 1px solid var(--gl-border-color, #dbd7e6);
      border-radius: 4px;
      padding: 12px 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      animation: jobLogSlideIn 0.3s ease-out;
      color: var(--gl-text-color, #333238);
      font-size: 14px;
    `;

    // Add keyframes if they don't exist
    if (!document.getElementById('jobLogAnimations')) {
      const style = document.createElement('style');
      style.id = 'jobLogAnimations';
      style.innerHTML = `
        @keyframes jobLogSlideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }

    const emojiHtml = template.emoji ? `<span style="font-size: 16px;">${template.emoji}</span>` : '';

    notif.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:center; width: 24px; height: 24px; background: rgba(16,133,72,0.1); border-radius: 50%; color: #108548;">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="currentColor">
          <path d="M14.207 4.293a1 1 0 0 0-1.414-1.414L6.5 9.172 3.707 6.379a1 1 0 1 0-1.414 1.414l3.5 3.5a1 1 0 0 0 1.414 0l7-7z"/>
        </svg>
      </div>
      <div class="job-tracker-badge-copy" style="font-weight: bold; display:flex; align-items:center; gap:4px; padding: 2px 4px; border-radius: 4px; cursor: pointer;" title="Click to copy value">
         ${emojiHtml} <span class="badge-copy-text" style="text-decoration: underline; text-decoration-style: dotted; text-underline-offset: 4px;">${Utils.escapeHtml(badgeText)}</span>
      </div>
    `;

    notif.querySelector('.job-tracker-badge-copy').addEventListener('click', (e) => {
      const target = e.currentTarget;
      Utils.copyToClipboard(badgeText).then(() => {
        const textSpan = target.querySelector('.badge-copy-text');
        const originalHtml = textSpan.innerHTML;
        textSpan.innerHTML = 'Copied!';
        textSpan.style.color = '#108548';
        target.style.background = 'rgba(16,133,72,0.1)';

        setTimeout(() => {
          textSpan.innerHTML = originalHtml;
          textSpan.style.color = '';
          target.style.background = '';
        }, 1500);
      });
    });

    container.appendChild(notif);
  }
};
