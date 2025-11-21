// AlbinoTiger-Addon/content.js
/**
 * AlbinoTiger v0.6.0
 * Now with external .md prompt files for better organization
 */

(function () {
  console.log('🐯 AlbinoTiger: Extension loaded');

  // 1. --- STATE & CONFIGURATION ---

  const PROMPT_LIBRARY = {
    'AlbinoTiger': {
      rootDir: 'AlbinoTiger', // EDITED: Per-app root directory
      prompts: [
        { id: 'dev_thorough', label: 'Thorough', file: 'at-dev-thorough.md' },
        { id: 'dev_quick', label: 'Quick', file: 'at-dev-quick.md' },
      ],
    },
    'General': {
      rootDir: 'AlbinoTiger', // EDITED: Per-app root directory
      prompts: [
        { id: 'general_learning', label: 'Learning', file: 'general-learning.md' },
        { id: 'general_coding', label: 'Coding', file: 'general-coding.md' },
        // general (writing in my voice, code question,)
      ],
    },
    // retro-royale
    // juician
    // cyanotype
  };

  let state = {
    currentApp: 'AlbinoTiger',
    customPrompt: '',
    toggledPrompts: new Set(),
    foundFiles: [],
    selectedFiles: new Set(),
    enabledFiles: new Set(),
    savedEnabledFiles: new Set(),
    isModalVisible: true,
    isSearchFocused: false,
    onceMode: false,
    serverOnline: false,
  };
  // Cache for loaded prompts to avoid re-fetching
  // Cache for loaded prompts (cleared on each page load to pick up changes)
  const promptCache = new Map();

  // Debounce utility
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  async function checkServerStatus() {
    try {
      const response = await fetch('http://localhost:12345/directory', {
        method: 'GET',
        signal: AbortSignal.timeout(2000) // 2 second timeout
      });
      const wasOnline = state.serverOnline;
      state.serverOnline = response.ok;
      if (state.serverOnline !== wasOnline) {
        console.log(`🐯 AlbinoTiger: Server ${state.serverOnline ? 'online' : 'offline'}`);
        updateFileSearchState();
      }
      return state.serverOnline;
    } catch (err) {
      const wasOnline = state.serverOnline;
      state.serverOnline = false;
      if (wasOnline) {
        console.log('🐯 AlbinoTiger: Server offline');
        updateFileSearchState();
      }
      return false;
    }
  }

  function updateFileSearchState() {
    const searchInput = document.getElementById('at-file-search-input');
    const fileList = document.getElementById('at-file-list');
    const serverStatus = document.getElementById('at-server-status');

    if (!searchInput || !fileList) return;

    if (state.serverOnline) {
      searchInput.disabled = false;
      searchInput.placeholder = 'Search files & folders...';
      searchInput.style.opacity = '1';
      searchInput.style.cursor = 'text';
      if (serverStatus) serverStatus.textContent = '';
      if (!searchInput.value) {
        fileList.innerHTML = '<div style="padding: 8px; color: var(--at-text-dim); text-align: center; font-size: 10px;">Start typing to search...</div>';
      }

      // EDITED: Restore previously enabled files when server comes back
      if (state.savedEnabledFiles.size > 0) {
        state.savedEnabledFiles.forEach(f => {
          if (state.selectedFiles.has(f)) {
            state.enabledFiles.add(f);
          }
        });
        state.savedEnabledFiles.clear();
        saveState();
        renderSelectedFiles();
      }
    } else {
      searchInput.disabled = true;
      searchInput.placeholder = '';
      searchInput.style.opacity = '0.5';
      searchInput.style.cursor = 'not-allowed';
      searchInput.value = '';
      state.foundFiles = [];
      if (serverStatus) serverStatus.textContent = '(server offline)';
      fileList.innerHTML = '<div style="padding: 8px; color: var(--at-text-dim); text-align: center; font-size: 10px;">Start server on port 12345</div>';

      // EDITED: Save enabled files before clearing, then deselect all
      if (state.enabledFiles.size > 0) {
        state.savedEnabledFiles = new Set(state.enabledFiles);
        state.enabledFiles.clear();
        saveState();
        renderSelectedFiles();
      }
    }
  }

  // Fuzzy search helper with better matching
  function fuzzyMatch(search, target) {
    search = search.toLowerCase();
    target = target.toLowerCase();

    // Exact match or contains gets priority
    if (target.includes(search)) return { match: true, priority: target.indexOf(search) === 0 ? 0 : 1 };

    // Simple fuzzy: allow for one character difference
    let searchIdx = 0;
    let errors = 0;
    for (let i = 0; i < target.length && searchIdx < search.length; i++) {
      if (target[i] === search[searchIdx]) {
        searchIdx++;
      } else {
        errors++;
      }
    }

    if (searchIdx === search.length && errors <= 2) {
      return { match: true, priority: 2 };
    }

    return { match: false, priority: 999 };
  }

  async function isFolderFullySelected(folderPath) {
    try {
      const url = `http://localhost:12345/folder-contents?path=${encodeURIComponent(folderPath)}`;
      const response = await fetch(url);
      if (!response.ok) return false;

      const filesInFolder = await response.json();
      if (filesInFolder.length === 0) return false;

      // All files in folder must be selected
      return filesInFolder.every(file => state.selectedFiles.has(file));
    } catch (err) {
      return false;
    }
  }
  function hasStorageAPI() {
    return typeof window.storage !== 'undefined' && window.storage?.get && window.storage?.set;
  }

  async function loadState() {
    try {
      let data = null;

      // EDITED: Try persistent storage API first
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

      // EDITED: Fall back to localStorage if API unavailable or no data
      if (!data) {
        const saved = localStorage.getItem('albinoTiger_state');
        if (saved) {
          data = JSON.parse(saved);
          console.log('🐯 AlbinoTiger: State loaded from localStorage (fallback)', data);
        }
      }

      // EDITED: Apply loaded data
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

      // EDITED: Try persistent storage API first
      if (hasStorageAPI()) {
        try {
          await window.storage.set('albinoTiger_state', JSON.stringify(stateData));
          console.log('🐯 AlbinoTiger: State saved to persistent storage API');
          return;
        } catch (apiErr) {
          console.warn('🐯 AlbinoTiger: Persistent storage API failed, falling back to localStorage:', apiErr);
        }
      }

      // EDITED: Fall back to localStorage
      localStorage.setItem('albinoTiger_state', JSON.stringify(stateData));
      console.log('🐯 AlbinoTiger: State saved to localStorage (fallback)');
    } catch (e) {
      console.error('🐯 AlbinoTiger: Error saving state', e);
    }
  }
  // EDITED: New function to load prompt content from .md files
  async function loadPromptContent(fileName) {
    // Check cache first
    if (promptCache.has(fileName)) {
      console.log('🐯 AlbinoTiger: Using cached prompt:', fileName);
      return promptCache.get(fileName);
    }

    try {
      const url = chrome.runtime.getURL(`prompts/${fileName}`);
      console.log('🐯 AlbinoTiger: Loading prompt from:', url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to load prompt: ${response.statusText}`);
      }

      const content = await response.text();
      promptCache.set(fileName, content);
      console.log('🐯 AlbinoTiger: Prompt loaded and cached:', fileName);
      return content;
    } catch (err) {
      console.error('🐯 AlbinoTiger: Error loading prompt file:', fileName, err);
      return `[Error loading prompt: ${fileName}]`;
    }
  }

  // 2. --- MODAL & UI INJECTION ---

  function injectUI() {
    console.log('🐯 AlbinoTiger: Injecting UI');

    const styles = `
    :root { /* EDITED */
    --at-primary: #f59e0b; /* EDITED: Amber/yellow */
    --at-primary-dark: #d97706; /* EDITED */
    --at-primary-light: #fbbf24; /* EDITED */
    --at-bg: #18181b; /* EDITED: Near black */
    --at-bg-alt: #27272a; /* EDITED: Dark zinc */
    --at-bg-light: #3f3f46; /* EDITED */
    --at-text: #fafafa; /* EDITED: Bright white */
    --at-text-dim: #a1a1aa; /* EDITED: Zinc gray */
    --at-border: #3f3f46; /* EDITED */
    --at-shadow: 0 4px 20px rgba(0, 0, 0, 0.6); /* EDITED */
  }
      
  #at-modal { /* EDITED */
  position: fixed;
  bottom: 16px;
  right: 16px;
  width: 350px;
  max-height: 552px;
         background: var(--at-bg);
        border: 2px solid var(--at-border);
        border-radius: 12px;
        box-shadow: var(--at-shadow);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
        font-size: 12px;
        color: var(--at-text);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease; /* EDITED */
        user-select: none;
        overflow: hidden; /* EDITED: Ensures content clips during transition */
      }
      
      #at-custom-prompt {
        user-select: text;
      }
      
      #at-modal.search-focused { /* EDITED */
      width: 550px;
      max-height: 690px; /* EDITED: 600 * 1.15 = 690 */
    }
      
    #at-modal[data-visible="false"] { /* EDITED */
    width: 185px; /* EDITED: Fixed width for smooth transition */
    max-height: 40px; /* EDITED: Just header height */
  }
         
  #at-modal[data-visible="false"] #at-body,
  #at-modal[data-visible="false"] #at-footer {
    opacity: 0;
    visibility: hidden;
    max-height: 0;
    padding: 0;
    overflow: hidden;
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), visibility 0s 0.3s, max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  #at-body, #at-footer {
    transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), padding 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
         
         #at-modal[data-visible="false"] #at-header {
    border-bottom: none;
    border-radius: 10px;
  }

      #at-header { /* EDITED */
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 12px;
      border-bottom: 2px solid #f59e0b; /* EDITED: Yellow border */
      background: #0a0a0a; /* EDITED: Black background */
      border-radius: 10px 10px 0 0;
      cursor: pointer;
      user-select: none;
      min-height: 20px;
    }
      
    #at-header h3 { /* EDITED */
    margin: 0;
    margin-right: 8px;
    font-size: 13px;
    font-weight: 700;
    color: #fbbf24;
    letter-spacing: 0.5px;
    line-height: 1;
    font-family: "Courier New", Courier, "Lucida Console", Monaco, monospace; /* EDITED: Universal monospace */
  }
      
  #at-toggle-modal { /* EDITED */
  cursor: pointer;
  font-weight: bold;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: rgba(251, 191, 36, 0.2); /* EDITED: Yellow tint */
  color: #fbbf24; /* EDITED: Yellow */
  font-size: 14px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  flex-shrink: 0;
}
       
#at-toggle-modal:hover { /* EDITED */
  background: rgba(251, 191, 36, 0.4); /* EDITED */
  transform: scale(1.1);
}

      #at-body {
        padding: 12px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: var(--at-bg);
        flex: 1;
      }
      
      .at-section {  
        display: flex;  
        flex-direction: column;  
        gap: 6px;  
      }
      
      .at-section-title {  
        font-weight: 600;
        margin: 0;
        color: var(--at-text-dim);
        font-size: 9px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .at-compact-row {
        display: flex;
        gap: 8px;
        align-items: flex-start;
      }
      
      .at-compact-row > .at-section {
        flex: 1;
        min-width: 0;
      }
      
      .at-dropdown {
        position: relative;
        width: 100%;
      }
      
      .at-dropdown-selected {
        width: 100%;
        padding: 6px 24px 6px 8px;
        border-radius: 6px;
        border: 1px solid var(--at-border);
        background: var(--at-bg-alt);
        color: var(--at-text);
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        box-sizing: border-box;
      }
      
      .at-dropdown-selected::after {
        content: '';
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        border: 4px solid transparent;
        border-top-color: var(--at-text-dim);
        pointer-events: none;
      }
      
      .at-dropdown.open .at-dropdown-selected::after {
        border-top-color: transparent;
        border-bottom-color: var(--at-text-dim);
        transform: translateY(-80%);
      }
      
      .at-dropdown-selected:hover {
        border-color: var(--at-primary);
      }
      
      .at-dropdown.open .at-dropdown-selected {
        border-color: var(--at-primary);
        box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
      }
      
      .at-dropdown-options {
        display: none;
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        background: var(--at-bg-alt);
        border: 1px solid var(--at-border);
        border-radius: 6px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        z-index: 1000;
        max-height: 150px;
        overflow-y: auto;
      }
      
      .at-dropdown.open .at-dropdown-options {
        display: block;
      }
      
      .at-dropdown-option {
        padding: 6px 8px;
        font-size: 11px;
        color: var(--at-text);
        cursor: pointer;
        transition: background 0.15s;
      }
      
      .at-dropdown-option:hover {
        background: var(--at-bg-light);
      }
      
      .at-dropdown-option.selected {
        background: var(--at-primary);
        color: white;
      }
      
      .at-dropdown-option:first-child {
        border-radius: 5px 5px 0 0;
      }
      
      .at-dropdown-option:last-child {
        border-radius: 0 0 5px 5px;
      }
      
      .at-dropdown-option:only-child {
        border-radius: 5px;
      }
      
      .at-once-toggle { /* EDITED */
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .at-once-toggle span {
      font-weight: 600;
      color: var(--at-text-dim);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .at-once-toggle input {
      accent-color: var(--at-primary);
      cursor: pointer;
      width: 14px;
      height: 14px;
    }
      
    #at-custom-prompt { /* EDITED */
        width: 100%;
        min-height: 75px; /* EDITED: 50 * 1.3 = 65 */
        padding: 7px 9px;
        border-radius: 6px;
        border: 1px solid var(--at-border);
        resize: vertical;
        box-sizing: border-box;
        background: var(--at-bg-alt);
        color: var(--at-text);
        font-size: 11px;
        font-family: inherit;
        transition: all 0.2s;
      }
      
      #at-custom-prompt:focus {
        outline: none;
        border-color: var(--at-primary);
        box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
      }
      
      #at-custom-prompt::placeholder {
        color: var(--at-text-dim);
      }
      
      #at-file-search-input {
        width: 100%;
        padding: 8px 10px;
        border-radius: 6px;
        border: 2px solid var(--at-border);
        box-sizing: border-box;
        background: var(--at-bg-alt);
        color: var(--at-text);
        font-size: 12px;
        transition: all 0.2s;
      }
      
      #at-file-search-input:disabled { /* EDITED */
        background: var(--at-bg);
        border-color: #52525b;
        color: var(--at-text-dim);
      }
      
      #at-file-search-input:focus {
        outline: none;
        border-color: var(--at-primary);
        box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
        background: var(--at-bg-light);
      }
      
      #at-file-search-input::placeholder {
        color: var(--at-text-dim);
      }
      
      #at-file-list {
        max-height: 100px;
        overflow-y: auto;
        border: 1px solid var(--at-border);
        border-radius: 6px;
        padding: 4px;
        background: var(--at-bg-alt);
        transition: max-height 0.3s;
      }
      
      #at-modal.search-focused #at-file-list {
        max-height: 180px;
      }
      
      .at-file-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 7px;
        border-radius: 4px;
        font-size: 11px;
        transition: all 0.2s;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .at-file-item:hover {
        background: var(--at-bg-light);
    }

    .at-file-item.folder-selected { /* EDITED: Visual state for fully-selected folder */
        background: rgba(245, 158, 11, 0.1);
        border-left: 3px solid var(--at-primary);
        padding-left: 4px;
    }
      .at-file-item input {
        cursor: pointer;
        flex-shrink: 0;
        accent-color: var(--at-primary);
      }
      .at-file-item strong {
        color: var(--at-text);
        flex-shrink: 0;
        cursor: pointer; /* EDITED */
      }
      .at-file-item-path {
          color: var(--at-text-dim);
        font-size: 9px;
        flex-shrink: 1;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .at-file-item-controls { /* EDITED */
        display: flex;
        align-items: center;
        gap: 4px;
        margin-left: auto;
      }

      .at-file-select-off { /* EDITED: Circle for select+disabled */
        width: 12px;
        height: 12px;
        border-radius: 50%;
        border: 2px solid #71717a;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .at-file-select-off:hover {
        border-color: var(--at-text-dim);
      }

      .at-file-select-off.active { /* EDITED: When file is selected but disabled */
        background: #52525b;
        border-color: #52525b;
      }
      
      #at-selected-files {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        padding: 8px;
        background: var(--at-bg-alt);
        border-radius: 6px;
        min-height: 30px;
        max-height: 100px;
        overflow-y: auto;
      }

      .at-selected-file-tag { /* EDITED */
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: #3f3f46;
        color: #d4d4d8;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        transition: all 0.2s;
        border: 1px solid #52525b;
      }

      .at-selected-file-tag.disabled { /* EDITED: Dimmed when toggled off */
        opacity: 0.4;
        background: #27272a;
      }
                
      .at-selected-file-tag:hover {
        background: #52525b;
        border-color: #71717a;
      }

      .at-selected-file-tag.disabled:hover { /* EDITED */
        background: #3f3f46;
      }

      .at-file-toggle-btn { /* EDITED: Toggle bubble */
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid #71717a;
      background: transparent;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    .at-file-toggle-btn.active { /* EDITED */
      background: var(--at-primary);
      border-color: var(--at-primary);
    }

    .at-file-toggle-btn.offline { /* EDITED: Disabled state when server offline */
      cursor: not-allowed;
      opacity: 0.4;
    }

      .at-file-remove {
        cursor: pointer;
        font-weight: bold;
        font-size: 12px;
        line-height: 1;
        padding: 0 2px;
        opacity: 0.8;
        transition: opacity 0.2s;
      }

      .at-file-remove:hover {
        opacity: 1;
        color: #ef4444; /* EDITED: Red on hover */
      }
      
      #at-footer {
        padding: 12px;
        border-top: 2px solid var(--at-border);
        background: var(--at-bg);
        border-radius: 0 0 10px 10px;
      }
      
      .at-button-row { /* EDITED */
        display: flex;
        gap: 6px;
      }
      
      .at-btn {
        padding: 10px;
        font-size: 12px;
        font-weight: 700;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        text-transform: uppercase;
      }
      
      .at-btn:hover {
        transform: translateY(-2px);
      }
      
      .at-btn:active {
        transform: translateY(0);
      }
      
      #at-go-button { /* EDITED */
      flex: 2;
      background: linear-gradient(135deg, #b45309 0%, #92400e 100%); /* EDITED: Darker amber */
    }
           
    #at-go-button:hover { /* EDITED */
      box-shadow: 0 4px 12px rgba(180, 83, 9, 0.4); /* EDITED */
      background: linear-gradient(135deg, #d97706 0%, #b45309 100%); /* EDITED */
    }
      
      #at-slow-button {
        flex: 1;
        background: var(--at-bg-light);
        font-size: 10px;
      }
      
      #at-slow-button:hover {
        background: var(--at-border);
      }
      
      #at-clear-button {
        width: 38px;
        background: #dc2626;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 10px 0;
      }
      
      #at-clear-button:hover {
        background: #ef4444;
        box-shadow: 0 4px 12px rgba(220, 38, 38, 0.4);
      }
      
      /* Scrollbar styling */
      #at-body::-webkit-scrollbar,
      #at-file-list::-webkit-scrollbar,
      #at-selected-files::-webkit-scrollbar {
        width: 6px;
      }
      
      #at-body::-webkit-scrollbar-track,
      #at-file-list::-webkit-scrollbar-track,
      #at-selected-files::-webkit-scrollbar-track {
        background: var(--at-bg-alt);
      }
      
      #at-body::-webkit-scrollbar-thumb,
      #at-file-list::-webkit-scrollbar-thumb,
      #at-selected-files::-webkit-scrollbar-thumb {
        background: var(--at-border);
        border-radius: 3px;
      }
      
      #at-body::-webkit-scrollbar-thumb:hover,
      #at-file-list::-webkit-scrollbar-thumb:hover,
      #at-selected-files::-webkit-scrollbar-thumb:hover {
        background: var(--at-primary);
      }
    `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Inject HTML
    const modalHTML = `
      <div id="at-modal" data-visible="true">
      <div id="at-header">
      <h3 style="display: flex; align-items: center; gap: 6px;"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/></svg>ALB1NO T1GER</h3>
      <div id="at-toggle-modal" title="Toggle Modal">−</div>
    </div>
        <div id="at-body">
        <div class="at-compact-row">
        <div class="at-section">
          <span class="at-section-title">App</span>
          <div class="at-dropdown" id="at-app-dropdown">
            <div class="at-dropdown-selected" id="at-app-selected">Select App</div>
            <div class="at-dropdown-options" id="at-app-options"></div>
          </div>
        </div>
        
        <div class="at-section">
          <span class="at-section-title">Prompts</span>
          <div class="at-dropdown" id="at-prompt-dropdown">
            <div class="at-dropdown-selected" id="at-prompt-selected">None</div>
            <div class="at-dropdown-options" id="at-prompt-options"></div>
          </div>
        </div>
        
        <div class="at-once-toggle">
          <span>Once</span>
          <input type="checkbox" id="at-once-checkbox" title="Reset prompt to None & toggle selected scripts off after GO">
        </div>
      </div>
          
      <div class="at-section">
      <label for="at-custom-prompt" class="at-section-title">Custom Prompt <span id="at-char-count" style="font-weight: 400; color: var(--at-text-dim);">(0)</span></label>
      <textarea id="at-custom-prompt" placeholder="Add custom instructions..."></textarea>
    </div>
          
          <div class="at-section">
          <label for="at-file-search-input" class="at-section-title">Project Files <span id="at-server-status" style="font-weight: 400; color: #ef4444;"></span></label>
          <input type="text" id="at-file-search-input" placeholder="Search files & folders...">
            <div id="at-file-list">
              <div style="padding: 8px; color: var(--at-text-dim); text-align: center; font-size: 10px;">Start typing to search...</div>
            </div>
          </div>
          
          <div class="at-section">
            <label class="at-section-title">Selected Files <span id="at-selected-stats" style="font-weight: 400; color: var(--at-text-dim);"></span></label> <!-- EDITED -->
            <div id="at-selected-files">
              <div style="width: 100%; text-align: center; color: var(--at-text-dim); font-size: 10px;">No files selected</div>
            </div>
          </div>
        </div>
        
        <div id="at-footer">
          <div class="at-button-row">
            <button id="at-go-button" class="at-btn">GO</button>
            <button id="at-slow-button" class="at-btn">SLOW</button>
            <button id="at-clear-button" class="at-btn"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg></button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('🐯 AlbinoTiger: UI injected');
  }

  // 3. --- UI RENDERING & STATE UPDATES ---

  function renderAppSelector() {
    const selected = document.getElementById('at-app-selected');
    const options = document.getElementById('at-app-options');
    options.innerHTML = '';

    selected.textContent = state.currentApp;

    Object.keys(PROMPT_LIBRARY).forEach(appName => {
      const option = document.createElement('div');
      option.className = 'at-dropdown-option' + (appName === state.currentApp ? ' selected' : '');
      option.dataset.value = appName;
      option.textContent = appName;
      options.appendChild(option);
    });
  }

  function renderPromptSelector() {
    const selected = document.getElementById('at-prompt-selected');
    const options = document.getElementById('at-prompt-options');
    options.innerHTML = '';

    const appConfig = PROMPT_LIBRARY[state.currentApp];
    const prompts = appConfig?.prompts || [];

    // Determine selected label
    let selectedLabel = 'None';
    if (state.toggledPrompts.size > 0) {
      const selectedId = Array.from(state.toggledPrompts)[0];
      const selectedPrompt = prompts.find(p => p.id === selectedId);
      if (selectedPrompt) selectedLabel = selectedPrompt.label;
    }
    selected.textContent = selectedLabel;

    // Add "None" option
    const noneOption = document.createElement('div');
    noneOption.className = 'at-dropdown-option' + (state.toggledPrompts.size === 0 ? ' selected' : '');
    noneOption.dataset.value = '';
    noneOption.textContent = 'None';
    options.appendChild(noneOption);

    prompts.forEach(prompt => {
      const option = document.createElement('div');
      option.className = 'at-dropdown-option' + (state.toggledPrompts.has(prompt.id) ? ' selected' : '');
      option.dataset.value = prompt.id;
      option.textContent = prompt.label;
      options.appendChild(option);
    });
  }

  async function renderFileList() {
    const container = document.getElementById('at-file-list');
    container.innerHTML = '';

    if (state.foundFiles.length === 0) {
      const query = document.getElementById('at-file-search-input')?.value || '';
      const message = query ? 'No matching files or folders.' : 'Start typing to search...';
      container.innerHTML = `<div style="padding: 8px; color: var(--at-text-dim); text-align: center; font-size: 10px;">${message}</div>`;
      return;
    }

    for (const filePath of state.foundFiles) {
      const isDirectory = filePath.endsWith('/');
      const cleanPath = isDirectory ? filePath.slice(0, -1) : filePath;
      const isSelected = state.selectedFiles.has(cleanPath);
      const isEnabled = state.enabledFiles.has(cleanPath);
      const isFolderFull = isDirectory ? await isFolderFullySelected(cleanPath) : false;

      const parts = cleanPath.split(/[/\\]/);
      const name = parts.pop() || cleanPath;
      const dirPath = parts.join('/');

      const item = document.createElement('div');
      item.className = 'at-file-item' + (isFolderFull ? ' folder-selected' : '');
      item.dataset.path = cleanPath;
      item.dataset.type = isDirectory ? 'folder' : 'file';

      // Checkbox: checked if selected (regardless of enabled state)
      const checkboxChecked = isSelected || isFolderFull;

      // Circle: show as active (filled) when enabled, empty when disabled
      const circleActive = isEnabled;

      item.innerHTML = `
        <input type="checkbox" class="at-file-toggle-on" data-path="${cleanPath}" ${checkboxChecked ? 'checked' : ''} title="Select/deselect file">
        <strong>${isDirectory ? '📁' : '📄'} ${name}</strong>
        <div class="at-file-item-controls">
          <span class="at-file-item-path">${dirPath}</span>
          <span class="at-file-select-off ${circleActive ? 'active' : ''}" data-path="${cleanPath}" data-type="${isDirectory ? 'folder' : 'file'}" title="Toggle on/off"></span>
        </div>
      `;
      container.appendChild(item);
    }
  }
  async function renderSelectedFiles() { // EDITED
    const container = document.getElementById('at-selected-files');
    const statsEl = document.getElementById('at-selected-stats');
    container.innerHTML = '';

    if (state.selectedFiles.size === 0) {
      container.innerHTML = '<div style="width: 100%; text-align: center; color: var(--at-text-dim); font-size: 10px;">No files selected</div>';
      if (statsEl) statsEl.innerHTML = '';
      return;
    }

    Array.from(state.selectedFiles).sort().forEach(filePath => {
      const parts = filePath.split(/[/\\]/);
      const name = parts.pop() || filePath;
      const isEnabled = state.enabledFiles.has(filePath);
      const isOffline = !state.serverOnline; // EDITED

      const tag = document.createElement('div');
      tag.className = 'at-selected-file-tag' + (isEnabled ? '' : ' disabled');
      tag.innerHTML = `
        <span class="at-file-toggle-btn ${isEnabled ? 'active' : ''} ${isOffline ? 'offline' : ''}" data-path="${filePath}" title="${isOffline ? 'Server offline' : 'Toggle file'}"></span>
        <span>${name}</span>
        <span class="at-file-remove" data-path="${filePath}" title="Remove file">×</span>
      `;
      container.appendChild(tag);
    });

    // EDITED: Calculate total lines across ENABLED files only
    if (statsEl) {
      const enabledCount = state.enabledFiles.size;
      const totalCount = state.selectedFiles.size;
      statsEl.innerHTML = `(${enabledCount}/${totalCount}, counting...)`;

      let totalLines = 0;
      for (const filePath of state.enabledFiles) { // EDITED: Only count enabled
        try {
          const content = await getFileContent(filePath);
          if (content) {
            totalLines += content.split('\n').length;
          }
        } catch (e) {
          // Skip files that can't be read
        }
      }
      statsEl.innerHTML = `(${enabledCount}/${totalCount}, <strong>${totalLines.toLocaleString()}</strong> lines)`;
    }
  }
  async function updateAllUI() { // EDITED: async to await renderFileList
    renderAppSelector();
    renderPromptSelector();
    await renderFileList(); // EDITED: await for folder state checks
    await renderSelectedFiles(); // EDITED: already async, now awaited here
    updateFileSearchState();

    const customPromptEl = document.getElementById('at-custom-prompt');
    customPromptEl.value = state.customPrompt;
    const charCount = state.customPrompt.length;
    const countEl = document.getElementById('at-char-count');
    if (countEl) {
      countEl.textContent = `(${charCount.toLocaleString()})`;
    }
    document.getElementById('at-modal').dataset.visible = state.isModalVisible;

    document.getElementById('at-toggle-modal').textContent = state.isModalVisible ? '−' : '+';
    document.getElementById('at-once-checkbox').checked = state.onceMode;
  }

  // 4. --- EVENT LISTENERS ---

  function addListeners() {
    console.log('🐯 AlbinoTiger: Adding event listeners');

    // Header toggle
    document.getElementById('at-header').addEventListener('click', (e) => {
      if (e.target.id !== 'at-toggle-modal') {
        state.isModalVisible = !state.isModalVisible;
        document.getElementById('at-modal').dataset.visible = state.isModalVisible;
        document.getElementById('at-toggle-modal').textContent = state.isModalVisible ? '−' : '+';
        saveState();
      }
    });

    document.getElementById('at-toggle-modal').addEventListener('click', (e) => {
      e.stopPropagation();
      state.isModalVisible = !state.isModalVisible;
      document.getElementById('at-modal').dataset.visible = state.isModalVisible;
      document.getElementById('at-toggle-modal').textContent = state.isModalVisible ? '−' : '+';
      saveState();
    });

    // App Profile Selector
    const appDropdown = document.getElementById('at-app-dropdown');
    const appSelected = document.getElementById('at-app-selected');
    const appOptions = document.getElementById('at-app-options');

    appSelected.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other dropdowns
      document.getElementById('at-prompt-dropdown').classList.remove('open');
      appDropdown.classList.toggle('open');
    });

    appOptions.addEventListener('click', (e) => {
      const option = e.target.closest('.at-dropdown-option');
      if (option) {
        const value = option.dataset.value;
        console.log('🐯 AlbinoTiger: App changed to', value);
        state.currentApp = value;
        state.toggledPrompts.clear();
        state.selectedFiles.clear(); // Clear files when switching apps
        renderAppSelector();
        renderPromptSelector();
        renderSelectedFiles();
        saveState();
        appDropdown.classList.remove('open');
      }
    });

    // Custom Dropdown: Prompt Selector
    const promptDropdown = document.getElementById('at-prompt-dropdown');
    const promptSelected = document.getElementById('at-prompt-selected');
    const promptOptions = document.getElementById('at-prompt-options');

    promptSelected.addEventListener('click', (e) => {
      e.stopPropagation();
      // Close other dropdowns
      appDropdown.classList.remove('open');
      promptDropdown.classList.toggle('open');
    });

    promptOptions.addEventListener('click', (e) => {
      const option = e.target.closest('.at-dropdown-option');
      if (option) {
        const value = option.dataset.value;
        state.toggledPrompts.clear();
        if (value) {
          state.toggledPrompts.add(value);
        }
        console.log('🐯 AlbinoTiger: Selected prompt:', value || 'None');
        renderPromptSelector();
        saveState();
        promptDropdown.classList.remove('open');
      }
    });

    // Custom Prompt
    document.getElementById('at-custom-prompt').addEventListener('focus', () => {
      state.isSearchFocused = true;
      document.getElementById('at-modal').classList.add('search-focused');
    });

    document.getElementById('at-custom-prompt').addEventListener('input', (e) => {
      state.customPrompt = e.target.value;
      const charCount = state.customPrompt.length;
      const countEl = document.getElementById('at-char-count');
      if (countEl) {
        countEl.textContent = `(${charCount.toLocaleString()})`;
      }
      saveState();
    });

    // Enter to GO, Shift+Enter for newline
    document.getElementById('at-custom-prompt').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('at-modal').classList.remove('search-focused');
        state.isSearchFocused = false;
        onGoButtonClick(true);
      }
    });

    // Once Mode Toggle // EDITED
    document.getElementById('at-once-checkbox').addEventListener('change', (e) => {
      state.onceMode = e.target.checked;
      saveState();
    });

    // Click outside modal to collapse search // EDITED
    document.addEventListener('click', (e) => {
      const modal = document.getElementById('at-modal');
      if (!modal.contains(e.target)) {
        if (state.isSearchFocused) {
          state.isSearchFocused = false;
          modal.classList.remove('search-focused');
        }
      }
      // Close dropdowns when clicking outside them
      if (!e.target.closest('.at-dropdown')) {
        document.querySelectorAll('.at-dropdown.open').forEach(d => d.classList.remove('open'));
      }
    });

    // File Search with focus management
    const searchInput = document.getElementById('at-file-search-input');

    searchInput.addEventListener('focus', () => {
      state.isSearchFocused = true;
      document.getElementById('at-modal').classList.add('search-focused');
    });

    const debouncedSearch = debounce(async (query) => {
      console.log('🐯 AlbinoTiger: Debounced search triggered with query:', query);
      if (!query) {
        state.foundFiles = [];
        renderFileList();
        return;
      }
      await searchFiles(query);
    }, 300);

    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      debouncedSearch(query);
    });

    document.getElementById('at-file-list').addEventListener('click', async (e) => {
      const item = e.target.closest('.at-file-item');
      if (!item) return;

      const path = item.dataset.path;
      const type = item.dataset.type;
      const checkboxOn = item.querySelector('.at-file-toggle-on');

      // Checkbox click: toggle selection (always enable when adding)
      if (e.target.classList.contains('at-file-toggle-on')) {
        e.stopPropagation();
        const isChecked = checkboxOn.checked;

        if (type === 'file') {
          if (isChecked) {
            state.selectedFiles.add(path);
            state.enabledFiles.add(path);
          } else {
            state.selectedFiles.delete(path);
            state.enabledFiles.delete(path);
          }
          await renderFileList();
          await renderSelectedFiles();
          saveState();
        } else if (type === 'folder') {
          await handleFolderToggle(path, isChecked, true);
          await renderFileList();
          await renderSelectedFiles();
          saveState();
        }
        return;
      }

      // Circle click: toggle enabled/disabled (same as Selected Files section)
      if (e.target.classList.contains('at-file-select-off')) {
        e.stopPropagation();

        if (type === 'file') {
          // If not selected, add it but disabled
          if (!state.selectedFiles.has(path)) {
            state.selectedFiles.add(path);
            // Don't add to enabledFiles - leave disabled
          } else {
            // Already selected: toggle enabled state
            if (state.enabledFiles.has(path)) {
              state.enabledFiles.delete(path);
            } else {
              state.enabledFiles.add(path);
            }
          }
          await renderFileList();
          await renderSelectedFiles();
          saveState();
        } else if (type === 'folder') {
          // For folders: toggle all files' enabled state
          try {
            const url = `http://localhost:12345/folder-contents?path=${encodeURIComponent(path)}`;
            const response = await fetch(url);
            if (response.ok) {
              const filesInFolder = await response.json();
              const allSelected = filesInFolder.every(f => state.selectedFiles.has(f));

              if (!allSelected) {
                // Some files not selected: select all but disabled
                filesInFolder.forEach(f => {
                  state.selectedFiles.add(f);
                  state.enabledFiles.delete(f);
                });
              } else {
                // All selected: toggle enabled state
                const allEnabled = filesInFolder.every(f => state.enabledFiles.has(f));
                filesInFolder.forEach(f => {
                  if (allEnabled) {
                    state.enabledFiles.delete(f);
                  } else {
                    state.enabledFiles.add(f);
                  }
                });
              }
              await renderFileList();
              await renderSelectedFiles();
              saveState();
            }
          } catch (err) {
            console.error('🐯 AlbinoTiger: Error toggling folder:', err);
          }
        }
        return;
      }

      // Clicking on file name/icon: same as checkbox
      if (e.target.tagName === 'STRONG' || e.target.closest('strong')) {
        e.stopPropagation();
        checkboxOn.checked = !checkboxOn.checked;
        const isChecked = checkboxOn.checked;

        if (type === 'file') {
          if (isChecked) {
            state.selectedFiles.add(path);
            state.enabledFiles.add(path);
          } else {
            state.selectedFiles.delete(path);
            state.enabledFiles.delete(path);
          }
          await renderFileList();
          await renderSelectedFiles();
          saveState();
        } else if (type === 'folder') {
          await handleFolderToggle(path, isChecked, true);
          await renderFileList();
          await renderSelectedFiles();
          saveState();
        }
      }
    });

    // Remove selected files
    document.getElementById('at-selected-files').addEventListener('click', (e) => {
      e.stopPropagation();

      // EDITED: Toggle file enabled/disabled (only if server online)
      if (e.target.classList.contains('at-file-toggle-btn')) {
        if (!state.serverOnline) {
          console.log('🐯 AlbinoTiger: Cannot toggle files while server offline');
          return; // EDITED: Block toggling when offline
        }
        const path = e.target.dataset.path;
        if (state.enabledFiles.has(path)) {
          state.enabledFiles.delete(path);
        } else {
          state.enabledFiles.add(path);
        }
        renderSelectedFiles();
        saveState();
        return;
      }

      // Remove file entirely (always allowed)
      if (e.target.classList.contains('at-file-remove')) {
        const path = e.target.dataset.path;
        state.selectedFiles.delete(path);
        state.enabledFiles.delete(path);
        renderSelectedFiles();
        renderFileList();
        saveState();
      }
    });

    // GO Button
    document.getElementById('at-go-button').addEventListener('click', () => {
      document.getElementById('at-modal').classList.remove('search-focused');
      state.isSearchFocused = false;
      onGoButtonClick(true); // true = auto-send
    });

    // SLOW Button - paste only // EDITED
    document.getElementById('at-slow-button').addEventListener('click', () => {
      document.getElementById('at-modal').classList.remove('search-focused');
      state.isSearchFocused = false;
      onGoButtonClick(false); // false = paste only
    });

    // Clear Button - clear the AI input box // EDITED
    document.getElementById('at-clear-button').addEventListener('click', () => {
      clearChatInput();
    });

    console.log('🐯 AlbinoTiger: Event listeners added');
  }

  // 5. --- CORE LOGIC ---

  async function searchFiles(query) {
    // EDITED: Don't search if server is offline
    if (!state.serverOnline) {
      console.log('🐯 AlbinoTiger: Server offline, skipping search');
      return;
    }

    try {
      console.log('🐯 AlbinoTiger: Searching for files with query:', query);
      const appConfig = PROMPT_LIBRARY[state.currentApp];
      const rootDir = appConfig?.rootDir || '';
      const url = `http://localhost:12345/search?q=${encodeURIComponent(query)}&root=${encodeURIComponent(rootDir)}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      let files = await response.json();
      console.log('🐯 AlbinoTiger: Found', files.length, 'entries:', files);

      // Apply fuzzy filtering and sorting client-side
      const results = files.map(file => {
        const isDirectory = file.endsWith('/');
        const cleanPath = isDirectory ? file.slice(0, -1) : file;
        const fileName = cleanPath.split(/[/\\]/).pop() || cleanPath;
        const matchResult = fuzzyMatch(query, fileName);

        return {
          path: file,
          match: matchResult.match,
          priority: matchResult.priority
        };
      })
        .filter(item => item.match)
        .sort((a, b) => a.priority - b.priority)
        .map(item => item.path);

      state.foundFiles = results;
      renderFileList();
    } catch (err) {
      console.error('🐯 AlbinoTiger: Error searching files:', err);
      state.serverOnline = false; // EDITED: Mark server as offline
      updateFileSearchState(); // EDITED: Update UI
      state.foundFiles = [];
      renderFileList();
    }
  }

  async function handleFolderToggle(folderPath, isChecked, enableFiles = true) {
    try {
      console.log(`🐯 AlbinoTiger: Fetching contents for folder: ${folderPath}`);
      const url = `http://localhost:12345/folder-contents?path=${encodeURIComponent(folderPath)}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const filesInFolder = await response.json();
      console.log(`🐯 AlbinoTiger: Folder contains ${filesInFolder.length} files.`);

      if (isChecked) {
        // EDITED: Toggle ON - add files to both selected and enabled (or just selected if enableFiles=false)
        filesInFolder.forEach(file => {
          state.selectedFiles.add(file);
          if (enableFiles) {
            state.enabledFiles.add(file);
          }
          // Note: if enableFiles is false, we don't touch enabledFiles, leaving file disabled
        });
        console.log(`🐯 AlbinoTiger: Added ${filesInFolder.length} files (enabled: ${enableFiles}).`);
      } else {
        // EDITED: Toggle OFF - remove from both selected and enabled
        filesInFolder.forEach(file => {
          state.selectedFiles.delete(file);
          state.enabledFiles.delete(file);
        });
        console.log(`🐯 AlbinoTiger: Removed ${filesInFolder.length} files from selection.`);
      }

      saveState();

    } catch (err) {
      console.error('🐯 AlbinoTiger: Error fetching folder contents:', err);
      alert(`AlbinoTiger Error: Could not get contents for folder ${folderPath}.`);
    }
  }

  async function getFileContent(filePath) {
    try {
      console.log('🐯 AlbinoTiger: Fetching file content for:', filePath);
      const url = `http://localhost:12345/file?path=${encodeURIComponent(filePath)}`;
      console.log('🐯 AlbinoTiger: Fetch URL:', url);

      const response = await fetch(url);
      console.log('🐯 AlbinoTiger: Server response status:', response.status);

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      const content = await response.text();
      console.log('🐯 AlbinoTiger: File content length:', content.length);
      return content;
    } catch (err) {
      console.error('🐯 AlbinoTiger: Error fetching file:', filePath, err);
      return null;
    }
  }

  async function onGoButtonClick(autoSend = true) { // EDITED
    console.log('🐯 AlbinoTiger: ===== GO BUTTON CLICKED =====');
    console.log('🐯 AlbinoTiger: Auto-send:', autoSend);

    // Collapse search on GO
    state.isSearchFocused = false;
    document.getElementById('at-modal').classList.remove('search-focused');

    const finalPrompt = [];
    const hasCustomPrompt = state.customPrompt.trim().length > 0; // EDITED
    const hasAppPrompts = state.toggledPrompts.size > 0; // EDITED

    // 1. Add Custom Prompt
    if (hasCustomPrompt) { // EDITED
      console.log('🐯 AlbinoTiger: Adding custom prompt');
      finalPrompt.push(state.customPrompt.trim());
    }

    // EDITED: Add authority divider if both custom and app prompts exist
    if (hasCustomPrompt && hasAppPrompts) { // EDITED
      const divider = [
        '====================',
        '',
        '⚠️  **PROMPT AUTHORITY NOTICE**',
        '',
        'The CUSTOM PROMPT above has **ultimate authority** over the context prompt below.',
        'Should any contradictions arise between them, follow the custom prompt\'s instructions.',
        '',
        '===================='
      ].join('\n');
      finalPrompt.push(divider);
      console.log('🐯 AlbinoTiger: Added authority divider');
    } // EDITED

    // 2. Add Predefined Prompts
    const appConfig = PROMPT_LIBRARY[state.currentApp];
    const currentAppPrompts = appConfig?.prompts || [];
    for (const promptId of state.toggledPrompts) {
      const promptDef = currentAppPrompts.find(p => p.id === promptId);
      if (promptDef) {
        console.log('🐯 AlbinoTiger: Loading predefined prompt:', promptDef.label);
        const promptContent = await loadPromptContent(promptDef.file);
        finalPrompt.push(promptContent);
      }
    }

    // ...WITH THIS:
    function pasteTextIntoChat(text, autoSend = true) {
      console.log('🐯 AlbinoTiger: ===== ATTEMPTING TO PASTE =====');
      console.log('🐯 AlbinoTiger: Text length:', text.length);

      // EDITED: Site-specific and general selectors ordered by priority
      const selectors = [
        // ChatGPT specific
        '#prompt-textarea',
        'div[id="prompt-textarea"]',
        // Claude specific
        'div.ProseMirror[contenteditable="true"]',
        // Gemini specific
        'rich-textarea div[contenteditable="true"]',
        // Perplexity
        'textarea[placeholder*="Ask"]',
        // General fallbacks
        'div[contenteditable="true"][data-placeholder]',
        'div[contenteditable="true"]',
        'div.ProseMirror',
        'textarea[placeholder*="Reply"]',
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Chat"]',
        'textarea[placeholder*="Ask"]',
        'textarea[placeholder*="Type"]',
        'textarea[data-id="root"]',
        'div[role="textbox"]',
        'textarea',
      ];

      console.log('🐯 AlbinoTiger: Checking selectors...');

      let target = null;
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          console.log(`🐯 AlbinoTiger: Selector "${selector}" found ${elements.length} elements`);

          // EDITED: Find visible, non-disabled element
          for (const el of elements) {
            const rect = el.getBoundingClientRect();
            const isVisible = rect.width > 0 && rect.height > 0;
            const isDisabled = el.disabled || el.getAttribute('aria-disabled') === 'true';

            if (isVisible && !isDisabled) {
              target = el;
              console.log('🐯 AlbinoTiger: ✓ Found visible target with selector:', selector);
              break;
            }
          }
          if (target) break;
        } catch (e) {
          console.log(`🐯 AlbinoTiger: Selector "${selector}" failed:`, e.message);
        }
      }

      if (!target) {
        console.error('🐯 AlbinoTiger: ✗ Could not find chat input');
        alert('AlbinoTiger Error: Could not find the chat input. Please click on the chat box and try again.');
        return;
      }

      console.log('🐯 AlbinoTiger: Target tagName:', target.tagName);
      console.log('🐯 AlbinoTiger: Target contentEditable:', target.contentEditable);
      console.log('🐯 AlbinoTiger: Target id:', target.id);

      // EDITED: Click and focus to ensure element is active
      target.click();
      target.focus();

      // EDITED: Handle different input types
      const isContentEditable = target.contentEditable === 'true' || target.classList.contains('ProseMirror');
      const isTextarea = target.tagName.toLowerCase() === 'textarea';

      if (isContentEditable) {
        console.log('🐯 AlbinoTiger: Target is contenteditable');

        // EDITED: Clear existing content first
        target.innerHTML = '';

        // EDITED: For ChatGPT's #prompt-textarea, use paragraph structure
        if (target.id === 'prompt-textarea') {
          const p = document.createElement('p');
          p.textContent = text;
          target.appendChild(p);
        } else {
          target.textContent = text;
        }

        // EDITED: Dispatch comprehensive events
        ['focus', 'input', 'change', 'keydown', 'keyup'].forEach(eventType => {
          target.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });

        // EDITED: InputEvent for React/contenteditable
        target.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          cancelable: true,
          inputType: 'insertText',
          data: text
        }));

      } else if (isTextarea) {
        console.log('🐯 AlbinoTiger: Target is textarea');

        // EDITED: Set value using native setter to bypass React
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        )?.set;

        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(target, text);
        } else {
          target.value = text;
        }

        // EDITED: Dispatch events
        ['focus', 'input', 'change', 'keydown', 'keyup'].forEach(eventType => {
          target.dispatchEvent(new Event(eventType, { bubbles: true, cancelable: true }));
        });
      } else {
        // Fallback
        console.log('🐯 AlbinoTiger: Unknown target type, trying textContent');
        target.textContent = text;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }

      console.log('🐯 AlbinoTiger: ✓ Text pasted successfully');

      // EDITED: Auto-send if requested
      if (autoSend) {
        console.log('🐯 AlbinoTiger: Attempting to send message...');
        setTimeout(() => {
          sendMessage(target);
        }, 150); // Slightly longer delay for React state updates
      }

      // Reset prompt if Once mode is enabled
      if (state.onceMode) {
        if (state.toggledPrompts.size > 0) {
          state.toggledPrompts.clear();
          renderPromptSelector();
          console.log('🐯 AlbinoTiger: Once mode - prompt reset to None');
        }
        if (state.enabledFiles.size > 0) { // EDITED: Disable all files
          state.enabledFiles.clear();
          renderSelectedFiles();
          console.log('🐯 AlbinoTiger: Once mode - all files disabled');
        }
        saveState();
      }
    }

    // ...WITH THIS:
    function sendMessage(target) {
      console.log('🐯 AlbinoTiger: ===== ATTEMPTING TO SEND =====');

      // EDITED: Site-specific and general send button selectors
      const sendButtonSelectors = [
        // ChatGPT specific
        'button[data-testid="send-button"]',
        'button[data-testid="composer-send-button"]',
        'form button[type="submit"]',
        // Claude specific
        'button[aria-label="Send Message"]',
        'button[aria-label="Send message"]',
        // Gemini specific
        'button[aria-label="Send message"]',
        'button.send-button',
        // Perplexity
        'button[aria-label="Submit"]',
        // Poe
        'button[class*="SendButton"]',
        // General
        'button[aria-label="Send"]',
        'button[aria-label="send"]',
        'button[type="submit"]',
        'button[class*="send"]',
        'button[class*="Send"]',
        // SVG icon buttons (arrow up typically means send)
        'button svg[class*="icon"]',
      ];

      // EDITED: Try multiple approaches to find send button
      for (const selector of sendButtonSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            // Get the actual button (might be the element or its parent)
            const btn = el.tagName === 'BUTTON' ? el : el.closest('button');
            if (btn && !btn.disabled && btn.offsetParent !== null) {
              const rect = btn.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                console.log('🐯 AlbinoTiger: Found send button with selector:', selector);
                btn.click();
                console.log('🐯 AlbinoTiger: ✓ Clicked send button');
                return;
              }
            }
          }
        } catch (e) {
          // Continue to next selector
        }
      }

      // EDITED: Try finding button near the input
      const inputContainer = target.closest('form') || target.parentElement?.parentElement?.parentElement;
      if (inputContainer) {
        const nearbyButtons = inputContainer.querySelectorAll('button');
        for (const btn of nearbyButtons) {
          if (!btn.disabled && btn.offsetParent !== null) {
            const rect = btn.getBoundingClientRect();
            // Look for small-ish buttons (likely send buttons, not large action buttons)
            if (rect.width > 0 && rect.width < 100 && rect.height > 0) {
              console.log('🐯 AlbinoTiger: Found nearby button, attempting click');
              btn.click();
              console.log('🐯 AlbinoTiger: ✓ Clicked nearby button');
              return;
            }
          }
        }
      }

      // EDITED: Fallback - simulate Enter key with better event construction
      console.log('🐯 AlbinoTiger: No send button found, simulating Enter key');

      const enterDown = new KeyboardEvent('keydown', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
      });

      const enterPress = new KeyboardEvent('keypress', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true,
        composed: true,
      });

      const enterUp = new KeyboardEvent('keyup', {
        key: 'Enter',
        code: 'Enter',
        keyCode: 13,
        which: 13,
        bubbles: true,
        composed: true,
      });

      target.dispatchEvent(enterDown);
      target.dispatchEvent(enterPress);
      target.dispatchEvent(enterUp);

      console.log('🐯 AlbinoTiger: ✓ Enter key events dispatched');
    }


    // ...WITH THIS:
    // EDITED: Clear the chat input box
    function clearChatInput() {
      console.log('🐯 AlbinoTiger: ===== CLEARING CHAT INPUT =====');

      // EDITED: Use same selectors as paste function
      const selectors = [
        '#prompt-textarea',
        'div[id="prompt-textarea"]',
        'div.ProseMirror[contenteditable="true"]',
        'rich-textarea div[contenteditable="true"]',
        'textarea[placeholder*="Ask"]',
        'div[contenteditable="true"][data-placeholder]',
        'div[contenteditable="true"]',
        'div.ProseMirror',
        'textarea[placeholder*="Reply"]',
        'textarea[placeholder*="Message"]',
        'textarea[placeholder*="message"]',
        'textarea[placeholder*="Chat"]',
        'textarea[placeholder*="Type"]',
        'textarea[data-id="root"]',
        'div[role="textbox"]',
        'textarea',
      ];

      let target = null;
      for (const selector of selectors) {
        try {
          const elements = document.querySelectorAll(selector);
          for (const el of elements) {
            const rect = el.getBoundingClientRect();
            if (rect.width > 0 && rect.height > 0) {
              target = el;
              break;
            }
          }
          if (target) break;
        } catch (e) {
          continue;
        }
      }

      if (!target) {
        console.log('🐯 AlbinoTiger: No chat input found to clear');
        return;
      }

      target.click();
      target.focus();

      const isContentEditable = target.contentEditable === 'true' || target.classList.contains('ProseMirror');
      const isTextarea = target.tagName.toLowerCase() === 'textarea';

      if (isContentEditable) {
        target.innerHTML = '';
        // EDITED: For ChatGPT, restore empty paragraph
        if (target.id === 'prompt-textarea') {
          target.innerHTML = '<p><br></p>';
        }
      } else if (isTextarea) {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLTextAreaElement.prototype, 'value'
        )?.set;
        if (nativeInputValueSetter) {
          nativeInputValueSetter.call(target, '');
        } else {
          target.value = '';
        }
      } else {
        target.textContent = '';
      }

      // Dispatch events to notify the site
      ['focus', 'input', 'change'].forEach(eventType => {
        target.dispatchEvent(new Event(eventType, { bubbles: true }));
      });

      console.log('🐯 AlbinoTiger: ✓ Chat input cleared');
    }

    // 6. --- INITIALIZATION ---

    async function initialize() { // EDITED: async to await loadState
      console.log('🐯 AlbinoTiger: Initializing...');
      await loadState(); // EDITED: await for storage API
      injectUI();
      updateAllUI();
      addListeners();

      checkServerStatus();
      setInterval(checkServerStatus, 5000);

      console.log('🐯 AlbinoTiger: ✓ Initialization complete');
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
      initialize();
    } else {
      window.addEventListener('DOMContentLoaded', initialize);
    }

  }) ();