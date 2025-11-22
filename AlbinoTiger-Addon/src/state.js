// AlbinoTiger-Addon/src/state.js
/**
 * State management for AlbinoTiger
 */

let state = { ...INITIAL_STATE };

function hasStorageAPI() {
  return typeof window.storage !== 'undefined' && window.storage?.get && window.storage?.set;
}

async function loadState() {
  try {
    let data = null;

    if (hasStorageAPI()) {
      try {
        const result = await window.storage.get('albinoTiger_state');
        if (result) {
          data = JSON.parse(result.value);
          console.log('🐯 AlbinoTiger: State loaded from persistent storage API', data);
        }
      } catch (apiErr) {
        console.warn('🐯 AlbinoTiger: Persistent storage API failed, falling back to localStorage:', apiErr);
      }
    }

    if (!data) {
      const saved = localStorage.getItem('albinoTiger_state');
      if (saved) {
        data = JSON.parse(saved);
        console.log('🐯 AlbinoTiger: State loaded from localStorage (fallback)', data);
      }
    }

    if (data) {
      state.currentApp = data.currentApp || 'AlbinoTiger';
      state.customPrompt = data.customPrompt || '';
      state.toggledPrompts = new Set(data.toggledPrompts || []);
      state.selectedFiles = new Set(data.selectedFiles || []);
      state.enabledFiles = new Set(data.enabledFiles || data.selectedFiles || []);
      state.savedEnabledFiles = new Set(data.savedEnabledFiles || []);
      state.isModalVisible = data.isModalVisible !== undefined ? data.isModalVisible : true;
      state.onceMode = data.onceMode || false;
    }
  } catch (e) {
    console.error('🐯 AlbinoTiger: Error loading state', e);
  }
}

async function saveState() {
  try {
    const stateData = {
      currentApp: state.currentApp,
      customPrompt: state.customPrompt,
      toggledPrompts: Array.from(state.toggledPrompts),
      selectedFiles: Array.from(state.selectedFiles),
      enabledFiles: Array.from(state.enabledFiles),
      savedEnabledFiles: Array.from(state.savedEnabledFiles),
      isModalVisible: state.isModalVisible,
      onceMode: state.onceMode,
    };

    if (hasStorageAPI()) {
      try {
        await window.storage.set('albinoTiger_state', JSON.stringify(stateData));
        console.log('🐯 AlbinoTiger: State saved to persistent storage API');
        return;
      } catch (apiErr) {
        console.warn('🐯 AlbinoTiger: Persistent storage API failed, falling back to localStorage:', apiErr);
      }
    }

    localStorage.setItem('albinoTiger_state', JSON.stringify(stateData));
    console.log('🐯 AlbinoTiger: State saved to localStorage (fallback)');
  } catch (e) {
    console.error('🐯 AlbinoTiger: Error saving state', e);
  }
}