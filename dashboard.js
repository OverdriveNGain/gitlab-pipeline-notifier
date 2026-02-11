document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('searchInput');
  const statusFilter = document.getElementById('statusFilter');
  const clearHistoryBtn = document.getElementById('clearHistoryBtn');

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
        (p.label && p.label.toLowerCase().includes(searchTerm));
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

  // Listen for storage changes
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.pipeline_history) {
      loadData();
    }
  });

  // Initial Load
  loadData();
});
