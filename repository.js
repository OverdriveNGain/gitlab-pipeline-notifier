const PipelineRepository = {
  getHistory: (callback) => {
    chrome.storage.local.get('pipeline_history', (result) => {
      callback(result.pipeline_history || []);
    });
  },

  saveHistory: (history, callback) => {
    chrome.storage.local.set({ 'pipeline_history': history }, callback);
  },

  addPipeline: (pipeline, callback) => {
    PipelineRepository.getHistory((history) => {
      history.unshift(pipeline);
      // Limit to last 50
      if (history.length > 50) history.pop();
      PipelineRepository.saveHistory(history, callback);
    });
  },

  updatePipeline: (id, updateFn, callback) => {
    PipelineRepository.getHistory((history) => {
      const index = history.findIndex(p => p.id.toString() === id.toString());
      if (index !== -1) {
        const updated = updateFn(history[index]);
        if (updated) {
          history[index] = { ...history[index], ...updated };
          PipelineRepository.saveHistory(history, callback);
          return;
        }
      }
      if (callback) callback();
    });
  },

  updateLabel: (id, newLabel, callback) => {
    PipelineRepository.updatePipeline(id, (pipeline) => ({ label: newLabel }), callback);
  },

  updateStatus: (id, newStatus, callback) => {
    PipelineRepository.updatePipeline(id, (pipeline) => {
      if (pipeline.status !== newStatus) {
        return { status: newStatus };
      }
      return null;
    }, callback);
  },

  deletePipeline: (id, callback) => {
    PipelineRepository.getHistory((history) => {
      const newHistory = history.filter(p => p.id.toString() !== id.toString());
      PipelineRepository.saveHistory(newHistory, callback);
    });
  },

  clearHistory: (callback) => {
    chrome.storage.local.remove('pipeline_history', callback);
  },

  // Pending Pipeline Logic
  savePending: (data, callback) => {
    chrome.storage.local.set({ 'pending_pipeline': data }, callback);
  },

  getPending: (callback) => {
    chrome.storage.local.get('pending_pipeline', (result) => {
      callback(result.pending_pipeline);
    });
  },

  clearPending: (callback) => {
    chrome.storage.local.remove('pending_pipeline', callback);
  }
};
