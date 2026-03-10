document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');
  const openFullScreenBtn = document.getElementById('openFullScreenBtn');

  // Check if we are already in full screen mode
  const isFullScreen = new URLSearchParams(window.location.search).get('mode') === 'fullscreen';
  if (isFullScreen) {
    if (openFullScreenBtn) openFullScreenBtn.style.display = 'none';
    document.body.classList.add('fullscreen-mode');
  }

  let allPipelines = [];

  // Load Data
  function loadData() {
    PipelineRepository.getHistory((history) => {
      allPipelines = history;
      render();
    });
  }

  function render() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;

    const filtered = allPipelines.filter(p => {
      const matchesSearch = (p.id && p.id.toString().includes(searchTerm)) ||
        (p.branch && p.branch.toLowerCase().includes(searchTerm)) ||
        (p.label && p.label.toLowerCase().includes(searchTerm)) ||
        (p.badges && p.badges.some(b => (b.text && b.text.toLowerCase().includes(searchTerm)) || (b.emoji && b.emoji.toLowerCase().includes(searchTerm))));
      const matchesStatus = statusValue === 'all' ||
        (p.status && p.status.toLowerCase() === statusValue) ||
        (statusValue === 'passed' && p.status && p.status.toLowerCase() === 'success');
      return matchesSearch && matchesStatus;
    });

    DashboardRenderer.renderList(filtered, 'pipelineList',
      (id, newLabel) => {
        PipelineRepository.updateLabel(id, newLabel);
      },
      (id) => {
        PipelineRepository.deletePipeline(id, () => {
          loadData();
        });
      },
      (id) => {
        const pipeline = allPipelines.find(p => p.id.toString() === id.toString());
        if (pipeline && pipeline.url) {
          const baseUrl = pipeline.url.split('/-/pipelines')[0];
          const url = new URL(`${baseUrl}/-/pipelines/new`);

          if (pipeline.ref) {
            url.searchParams.append('ref', pipeline.ref);
          }

          if (pipeline.variables && pipeline.variables.length > 0) {
            pipeline.variables.forEach(v => {
              if (v.key) {
                if (v.variableType === 'File') {
                  url.searchParams.append(`file_var[${v.key}]`, v.value || '');
                } else {
                  url.searchParams.append(`var[${v.key}]`, v.value || '');
                }
              }
            });
          }

          if (pipeline.label) {
            let newLabel = pipeline.label.trim();
            const copyMatch = newLabel.match(/\(Copy( \d+)?\)$/);
            if (copyMatch) {
              const numMatch = copyMatch[1];
              if (numMatch) {
                const count = parseInt(numMatch.trim(), 10);
                newLabel = newLabel.replace(/\(Copy \d+\)$/, `(Copy ${count + 1})`);
              } else {
                newLabel = newLabel.replace(/\(Copy\)$/, `(Copy 2)`);
              }
            } else {
              newLabel = `${newLabel} (Copy)`;
            }
            url.searchParams.append('tracker_label', newLabel);
          }

          chrome.tabs.create({ url: url.toString() });
        }
      }
    );
  }

  // Event Listeners
  searchInput.addEventListener('input', render);
  statusFilter.addEventListener('change', render);

  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all pipeline history?')) {
      PipelineRepository.clearHistory(() => {
        loadData();
      });
    }
  });

  if (openFullScreenBtn) {
    openFullScreenBtn.addEventListener('click', () => {
      const url = chrome.runtime.getURL('src/dashboard/dashboard.html?mode=fullscreen');
      chrome.tabs.create({ url: url });
    });
  }

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.pipeline_history) {
      loadData();
    }
  });

  // Initial Load
  loadData();
});
