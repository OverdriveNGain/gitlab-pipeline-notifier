const HistoryTab = {
  allPipelines: [],

  init: () => {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    const clearHistoryBtn = document.getElementById('clearHistoryBtn');

    // Event Listeners
    if (searchInput) {
      searchInput.addEventListener('input', HistoryTab.render);
    }
    if (statusFilter) {
      statusFilter.addEventListener('change', HistoryTab.render);
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear all pipeline history?')) {
          PipelineRepository.clearHistory(() => {
            HistoryTab.loadData();
          });
        }
      });
    }

    // Initial Load
    HistoryTab.loadData();
  },

  loadData: () => {
    PipelineRepository.getHistory((history) => {
      HistoryTab.allPipelines = history;
      HistoryTab.render();
    });
  },

  render: () => {
    const searchInput = document.getElementById('searchInput');
    const statusFilter = document.getElementById('statusFilter');
    
    if (!searchInput || !statusFilter) return;

    const searchTerm = searchInput.value.toLowerCase();
    const statusValue = statusFilter.value;

    const filtered = HistoryTab.allPipelines.filter(p => {
      const matchesSearch = (p.id && p.id.toString().includes(searchTerm)) ||
        (p.branch && p.branch.toLowerCase().includes(searchTerm)) ||
        (p.label && p.label.toLowerCase().includes(searchTerm)) ||
        (p.badges && p.badges.some(b => (b.text && b.text.toLowerCase().includes(searchTerm)) || (b.emoji && b.emoji.toLowerCase().includes(searchTerm))));
      const matchesStatus = statusValue === 'all' ||
        (p.status && p.status.toLowerCase() === statusValue) ||
        (statusValue === 'passed' && p.status && p.status.toLowerCase() === 'success');
      return matchesSearch && matchesStatus;
    });

    HistoryRenderer.renderList(filtered, 'pipelineList',
      (id, newLabel) => {
        PipelineRepository.updateLabel(id, newLabel);
      },
      (id) => {
        PipelineRepository.deletePipeline(id, () => {
          HistoryTab.loadData();
        });
      },
      (id) => {
        const pipeline = HistoryTab.allPipelines.find(p => p.id.toString() === id.toString());
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
};
