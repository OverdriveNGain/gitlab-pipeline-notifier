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
  },

  // Downstream Mapping Logic
  getPipelineMapping: (callback) => {
    chrome.storage.local.get('pipeline_mapping', (result) => {
      callback(result.pipeline_mapping || {});
    });
  },

  savePipelineMapping: (mapping, callback) => {
    chrome.storage.local.set({ 'pipeline_mapping': mapping }, callback);
  },

  addPipelineMapping: (childId, parentId, callback) => {
    PipelineRepository.getPipelineMapping((mapping) => {
      mapping[childId] = parentId;
      PipelineRepository.savePipelineMapping(mapping, callback);
    });
  },

  // Notify Only Logic
  getNotifyOnlyPipelines: (callback) => {
    chrome.storage.local.get('notify_only_pipelines', (result) => {
      callback(result.notify_only_pipelines || {});
    });
  },

  saveNotifyOnlyPipelines: (map, callback) => {
    chrome.storage.local.set({ 'notify_only_pipelines': map }, callback);
  },

  addNotifyOnlyPipeline: (pipelineId, callback) => {
    PipelineRepository.getNotifyOnlyPipelines((map) => {
      map[pipelineId] = Date.now();
      PipelineRepository.saveNotifyOnlyPipelines(map, callback);
    });
  },

  removeNotifyOnlyPipeline: (pipelineId, callback) => {
    PipelineRepository.getNotifyOnlyPipelines((map) => {
      delete map[pipelineId];
      PipelineRepository.saveNotifyOnlyPipelines(map, callback);
    });
  }
};

const ReviewRepository = {
  getHistory: (callback) => {
    chrome.storage.local.get('review_history', (result) => {
      callback(result.review_history || []);
    });
  },

  saveHistory: (history, callback) => {
    chrome.storage.local.set({ 'review_history': history }, callback);
  },

  addReviewActivity: (activity, callback) => {
    /* 
      activity schema:
      {
        timestamp: string (ISO string or similar),
        type: 'approved' | 'revoked' | 'commented' | 'thread_started' | 'thread_resolved',
        count?: number, // for batch comments
        repoName: string,
        mrId: string,
        mrTitle: string,
        author: string
      }
    */
    ReviewRepository.getHistory((history) => {
      history.unshift(activity);
      // Limit to last 200 review events
      if (history.length > 200) history.pop();
      ReviewRepository.saveHistory(history, callback);
    });
  },

  deleteReviewActivity: (timestamp, mrId, repoName, callback) => {
    ReviewRepository.getHistory((history) => {
      const newHistory = history.filter(a => !(a.timestamp === timestamp && a.mrId === mrId && a.repoName === repoName));
      ReviewRepository.saveHistory(newHistory, callback);
    });
  },

  clearHistory: (callback) => {
    chrome.storage.local.remove('review_history', callback);
  },

  getMrStates: (callback) => {
    chrome.storage.local.get('review_mr_states', (result) => {
      callback(result.review_mr_states || {});
    });
  },

  saveMrStates: (states, callback) => {
    chrome.storage.local.set({ 'review_mr_states': states }, callback);
  },

  setMrState: (repoName, mrId, state, callback) => {
    ReviewRepository.getMrStates((states) => {
      const key = `${repoName}:::${mrId}`;
      if (!state) {
        delete states[key];
      } else {
        states[key] = state;
      }
      ReviewRepository.saveMrStates(states, callback);
    });
  }
};
