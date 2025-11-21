// AlbinoTiger-Addon/content.js
/**
 * AlbinoTiger v0.6.0
 * Now with external .md prompt files for better organization
 */

(function () {
  console.log('🐯 AlbinoTiger: Extension loaded');

  // 1. --- STATE & CONFIGURATION ---

  const PROMPT_LIBRARY = {
    'AlbinoTigerDev': {
      rootDir: 'AlbinoTiger', // EDITED: Per-app root directory
      prompts: [
        { id: 'dev_thorough', label: 'Thorough', file: 'at-dev-thorough.md' },
        { id: 'dev_quick', label: 'Quick', file: 'at-dev-quick.md' },
      ],
    },
  };

  // Load state from localStorage
  let state = {
    currentApp: 'AlbinoTigerDev',
    customPrompt: '',
    toggledPrompts: new Set(),
    foundFiles: [],
    selectedFiles: new Set(),
    isModalVisible: true,
    isSearchFocused: false,
    onceMode: false, // EDITED: Reset prompt after GO
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

  // Load saved state
  function loadState() {
    try {
      const saved = localStorage.getItem('albinoTiger_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        state.currentApp = parsed.currentApp || 'AlbinoTigerDev'; // EDITED
        state.customPrompt = parsed.customPrompt || '';
        state.toggledPrompts = new Set(parsed.toggledPrompts || []);
        state.selectedFiles = new Set(parsed.selectedFiles || []);
        state.isModalVisible = parsed.isModalVisible !== undefined ? parsed.isModalVisible : true;
        state.onceMode = parsed.onceMode || false; // EDITED
        console.log('🐯 AlbinoTiger: State loaded from localStorage', state);
      }
    } catch (e) {
      console.error('🐯 AlbinoTiger: Error loading state', e);
    }
  }

  // Save state
  function saveState() {
    try {
      localStorage.setItem('albinoTiger_state', JSON.stringify({
        currentApp: state.currentApp,
        customPrompt: state.customPrompt,
        toggledPrompts: Array.from(state.toggledPrompts),
        selectedFiles: Array.from(state.selectedFiles),
        isModalVisible: state.isModalVisible,
        onceMode: state.onceMode, // EDITED
      }));
      console.log('🐯 AlbinoTiger: State saved');
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
      :root {
        --at-primary: #0ea5e9;
        --at-primary-dark: #0284c7;
        --at-primary-light: #38bdf8;
        --at-bg: #0f172a;
        --at-bg-alt: #1e293b;
        --at-bg-light: #334155;
        --at-text: #e2e8f0;
        --at-text-dim: #94a3b8;
        --at-border: #334155;
        --at-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
      }
      
      #at-modal {
        position: fixed;
        bottom: 16px;
        right: 16px;
        width: 300px;
        max-height: 480px;
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
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      
      #at-modal.search-focused {
        width: 500px;
        max-height: 600px;
      }
      
      #at-modal[data-visible="false"] {
        width: auto;
        height: auto;
        max-height: none;
      }
      
      #at-modal[data-visible="false"] #at-body,
      #at-modal[data-visible="false"] #at-footer {
        display: none;
      }

      #at-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px 14px;
        border-bottom: 2px solid var(--at-border);
        background: linear-gradient(135deg, var(--at-primary) 0%, var(--at-primary-dark) 100%);
        border-radius: 10px 10px 0 0;
        cursor: pointer;
        user-select: none;
      }
      
      #at-header h3 {
        margin: 0;
        font-size: 14px;
        font-weight: 700;
        color: white;
        letter-spacing: 0.5px;
      }
      
      #at-toggle-modal {
        cursor: pointer;
        font-weight: bold;
        padding: 4px 8px;
        border-radius: 5px;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        font-size: 14px;
        transition: all 0.2s;
      }
      #at-toggle-modal:hover {  
        background: rgba(255, 255, 255, 0.3);
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
      
      #at-app-selector,
      #at-prompt-selector {
        width: 100%;
        padding: 5px 7px;
        border-radius: 6px;
        border: 1px solid var(--at-border);
        background: var(--at-bg-alt);
        color: var(--at-text);
        font-size: 11px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      #at-app-selector:focus,
      #at-prompt-selector:focus {
        outline: none;
        border-color: var(--at-primary);
        box-shadow: 0 0 0 2px rgba(14, 165, 233, 0.2);
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
      
      #at-custom-prompt {
        width: 100%;
        min-height: 50px;
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
        cursor: pointer;
        font-size: 11px;
        transition: all 0.2s;
        overflow: hidden; 
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .at-file-item:hover {  
        background: var(--at-bg-light);
      }
      .at-file-item input {
        cursor: pointer;
        flex-shrink: 0;
        accent-color: var(--at-primary);
      }
      .at-file-item strong {
        color: var(--at-text);
        flex-shrink: 0;
      }
      .at-file-item-path {  
        color: var(--at-text-dim);
        margin-left: auto;
        font-size: 9px;
        flex-shrink: 1;
        overflow: hidden;
        text-overflow: ellipsis;
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
      
      .at-selected-file-tag {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 8px;
        background: var(--at-primary);
        color: white;
        border-radius: 4px;
        font-size: 10px;
        font-weight: 500;
        transition: all 0.2s;
      }
      
      .at-selected-file-tag:hover {
        background: var(--at-primary-light);
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
      }
      
      #at-footer {
        padding: 12px;
        border-top: 2px solid var(--at-border);
        background: var(--at-bg);
        border-radius: 0 0 10px 10px;
      }
      
      #at-go-button {
        width: 100%;
        padding: 10px;
        font-size: 13px;
        font-weight: 700;
        color: white;
        background: linear-gradient(135deg, var(--at-primary) 0%, var(--at-primary-dark) 100%);
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        letter-spacing: 0.5px;
        text-transform: uppercase;
      }
      #at-go-button:hover {  
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(14, 165, 233, 0.4);
      }
      #at-go-button:active {
        transform: translateY(0);
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
          <h3>🐯 ALBINO TIGER</h3>
          <div id="at-toggle-modal" title="Toggle Modal">−</div>
        </div>
        
        <div id="at-body">
        <div class="at-compact-row">
        <div class="at-section">
          <label for="at-app-selector" class="at-section-title">App</label>
          <select id="at-app-selector"></select>
        </div>
        
        <div class="at-section">
          <label for="at-prompt-selector" class="at-section-title">Prompts</label>
          <select id="at-prompt-selector"></select>
        </div>
        
        <div class="at-once-toggle">
        <span>Once</span>
        <input type="checkbox" id="at-once-checkbox" title="Reset prompt to None after GO">
      </div>
      </div>
          
          <div class="at-section">
            <label for="at-custom-prompt" class="at-section-title">Custom Prompt</label>
            <textarea id="at-custom-prompt" placeholder="Add custom instructions..."></textarea>
          </div>
          
          <div class="at-section">
            <label for="at-file-search-input" class="at-section-title">Project Files</label>
            <input type="text" id="at-file-search-input" placeholder="Search files & folders...">
            <div id="at-file-list">
              <div style="padding: 8px; color: var(--at-text-dim); text-align: center; font-size: 10px;">Start typing to search...</div>
            </div>
          </div>
          
          <div class="at-section">
            <label class="at-section-title">Selected Files</label>
            <div id="at-selected-files">
              <div style="width: 100%; text-align: center; color: var(--at-text-dim); font-size: 10px;">No files selected</div>
            </div>
          </div>
        </div>
        
        <div id="at-footer">
          <button id="at-go-button">GO</button>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    console.log('🐯 AlbinoTiger: UI injected');
  }

  // 3. --- UI RENDERING & STATE UPDATES ---

  function renderAppSelector() {
    const selector = document.getElementById('at-app-selector');
    selector.innerHTML = '';
    Object.keys(PROMPT_LIBRARY).forEach(appName => {
      const option = document.createElement('option');
      option.value = appName;
      option.innerText = appName;
      if (appName === state.currentApp) {
        option.selected = true;
      }
      selector.appendChild(option);
    });
  }

  function renderPromptSelector() {
    const selector = document.getElementById('at-prompt-selector');
    selector.innerHTML = '';
    const appConfig = PROMPT_LIBRARY[state.currentApp]; // EDITED
    const prompts = appConfig?.prompts || []; // EDITED

    // Add "None" option
    const noneOption = document.createElement('option');
    noneOption.value = '';
    noneOption.innerText = 'None';
    if (state.toggledPrompts.size === 0) {
      noneOption.selected = true;
    }
    selector.appendChild(noneOption);

    if (prompts.length === 0) {
      return;
    }

    prompts.forEach(prompt => {
      const option = document.createElement('option');
      option.value = prompt.id;
      option.innerText = prompt.label;
      if (state.toggledPrompts.has(prompt.id)) {
        option.selected = true;
      }
      selector.appendChild(option);
    });
  }

  function renderFileList() {
    const container = document.getElementById('at-file-list');
    container.innerHTML = '';

    if (state.foundFiles.length === 0) {
      const query = document.getElementById('at-file-search-input')?.value || '';
      const message = query ? 'No matching files or folders.' : 'Start typing to search...';
      container.innerHTML = `<div style="padding: 8px; color: var(--at-text-dim); text-align: center; font-size: 10px;">${message}</div>`;
      return;
    }

    state.foundFiles.forEach(filePath => {
      const isDirectory = filePath.endsWith('/');
      const cleanPath = isDirectory ? filePath.slice(0, -1) : filePath;
      const isChecked = state.selectedFiles.has(cleanPath);

      const parts = cleanPath.split(/[/\\]/);
      const name = parts.pop() || cleanPath;
      const dirPath = parts.join('/');

      const item = document.createElement('div');
      item.className = 'at-file-item';
      item.dataset.path = cleanPath;
      item.dataset.type = isDirectory ? 'folder' : 'file';

      item.innerHTML = `
        <input type="checkbox" class="at-file-toggle" data-path="${cleanPath}" ${isChecked ? 'checked' : ''}>
        <strong>${isDirectory ? '📁' : '📄'} ${name}</strong>
        <span class="at-file-item-path">${dirPath}</span>
      `;
      container.appendChild(item);
    });
  }

  function renderSelectedFiles() {
    const container = document.getElementById('at-selected-files');
    container.innerHTML = '';

    if (state.selectedFiles.size === 0) {
      container.innerHTML = '<div style="width: 100%; text-align: center; color: var(--at-text-dim); font-size: 10px;">No files selected</div>';
      return;
    }

    Array.from(state.selectedFiles).sort().forEach(filePath => {
      const parts = filePath.split(/[/\\]/);
      const name = parts.pop() || filePath;

      const tag = document.createElement('div');
      tag.className = 'at-selected-file-tag';
      tag.innerHTML = `
        <span>${name}</span>
        <span class="at-file-remove" data-path="${filePath}">×</span>
      `;
      container.appendChild(tag);
    });
  }

  function updateAllUI() {
    renderAppSelector();
    renderPromptSelector();
    renderFileList();
    renderSelectedFiles();

    document.getElementById('at-custom-prompt').value = state.customPrompt;
    document.getElementById('at-modal').dataset.visible = state.isModalVisible;
    document.getElementById('at-toggle-modal').textContent = state.isModalVisible ? '−' : '+';
    document.getElementById('at-once-checkbox').checked = state.onceMode; // EDITED
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
    document.getElementById('at-app-selector').addEventListener('change', (e) => {
      console.log('🐯 AlbinoTiger: App changed to', e.target.value);
      state.currentApp = e.target.value;
      state.toggledPrompts.clear();
      renderPromptSelector();
      saveState();
    });

    // Prompt Selector (single-select with None option)
    document.getElementById('at-prompt-selector').addEventListener('change', (e) => {
      const selectedValue = e.target.value;
      state.toggledPrompts.clear();

      if (selectedValue) {
        state.toggledPrompts.add(selectedValue);
      }

      console.log('🐯 AlbinoTiger: Selected prompt:', selectedValue || 'None');
      saveState();
    });

    // Custom Prompt
    document.getElementById('at-custom-prompt').addEventListener('input', (e) => {
      state.customPrompt = e.target.value;
      saveState();
    });

    // Once Mode Toggle // EDITED
    document.getElementById('at-once-checkbox').addEventListener('change', (e) => {
      state.onceMode = e.target.checked;
      saveState();
    });

    // Click outside modal to collapse search // EDITED
    document.addEventListener('click', (e) => {
      const modal = document.getElementById('at-modal');
      if (!modal.contains(e.target) && state.isSearchFocused) {
        state.isSearchFocused = false;
        modal.classList.remove('search-focused');
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

    // File Selection
    document.getElementById('at-file-list').addEventListener('click', async (e) => {
      const item = e.target.closest('.at-file-item');
      if (item) {
        const path = item.dataset.path;
        const type = item.dataset.type;
        const checkbox = item.querySelector('.at-file-toggle');

        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }

        const isChecked = checkbox.checked;

        if (type === 'file') {
          console.log('🐯 AlbinoTiger: File toggled', path, isChecked);
          if (isChecked) {
            state.selectedFiles.add(path);
          } else {
            state.selectedFiles.delete(path);
          }
          renderSelectedFiles();
          saveState();

        } else if (type === 'folder') {
          console.log('🐯 AlbinoTiger: Folder toggled', path, isChecked);
          await handleFolderToggle(path, isChecked);
          renderFileList();
          renderSelectedFiles();
        }
      }
    });

    // Remove selected files
    document.getElementById('at-selected-files').addEventListener('click', (e) => {
      e.stopPropagation(); // EDITED: Prevent click-outside handler from collapsing
      if (e.target.classList.contains('at-file-remove')) {
        const path = e.target.dataset.path;
        state.selectedFiles.delete(path);
        renderSelectedFiles();
        renderFileList();
        saveState();
      }
    });

    // GO Button
    document.getElementById('at-go-button').addEventListener('click', () => {
      document.getElementById('at-modal').classList.remove('search-focused');
      onGoButtonClick();
    });

    console.log('🐯 AlbinoTiger: Event listeners added');
  }

  // 5. --- CORE LOGIC ---

  async function searchFiles(query) {
    try {
      console.log('🐯 AlbinoTiger: Searching for files with query:', query);
      const appConfig = PROMPT_LIBRARY[state.currentApp]; // EDITED
      const rootDir = appConfig?.rootDir || ''; // EDITED
      const url = `http://localhost:12345/search?q=${encodeURIComponent(query)}&root=${encodeURIComponent(rootDir)}`; // EDITED

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
      alert('AlbinoTiger Error: Could not connect to local server. Make sure it\'s running on port 12345.');
      state.foundFiles = [];
      renderFileList();
    }
  }

  async function handleFolderToggle(folderPath, isChecked) {
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
        filesInFolder.forEach(file => {
          state.selectedFiles.add(file);
        });
        console.log(`🐯 AlbinoTiger: Added ${filesInFolder.length} files to selection.`);
      } else {
        filesInFolder.forEach(file => {
          state.selectedFiles.delete(file);
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

  async function onGoButtonClick() {
    console.log('🐯 AlbinoTiger: ===== GO BUTTON CLICKED =====');
    
    // Collapse search on GO // EDITED
    state.isSearchFocused = false;
    document.getElementById('at-modal').classList.remove('search-focused');
    
    const finalPrompt = [];
    
    // 1. Add Custom Prompt
    if (state.customPrompt.trim()) {
      console.log('🐯 AlbinoTiger: Adding custom prompt');
      finalPrompt.push(state.customPrompt.trim());
    }
    
    // 2. Add Predefined Prompts // EDITED: Updated for new structure
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

    // 3. Add Files (fetched fresh every time)
    if (state.selectedFiles.size > 0) {
      console.log('🐯 AlbinoTiger: Fetching', state.selectedFiles.size, 'files');
      const fileContents = [];
      const sortedFiles = Array.from(state.selectedFiles).sort();

      for (const filePath of sortedFiles) {
        const content = await getFileContent(filePath);
        if (content) {
          fileContents.push(
            `--- START FILE: ${filePath} ---\n\n${content}\n\n--- END FILE: ${filePath} ---`
          );
        }
      }
      finalPrompt.push(...fileContents);
    }

    if (finalPrompt.length === 0) {
      console.log('🐯 AlbinoTiger: No content to paste');
      alert('AlbinoTiger: No prompts or files selected.');
      return;
    }

    const combinedPrompt = finalPrompt.join('\n\n====================\n\n');
    console.log('🐯 AlbinoTiger: Final prompt created, length:', combinedPrompt.length);
    console.log('🐯 AlbinoTiger: First 200 chars:', combinedPrompt.substring(0, 200));

    pasteTextIntoChat(combinedPrompt);
  }

  function pasteTextIntoChat(text) {
    console.log('🐯 AlbinoTiger: ===== ATTEMPTING TO PASTE =====');
    console.log('🐯 AlbinoTiger: Text length:', text.length);

    const selectors = [
      'div[contenteditable="true"]',
      'div.ProseMirror',
      'textarea[placeholder*="Reply"]',
      'textarea[placeholder*="Message"]',
      'textarea[placeholder*="Chat"]',
      'textarea[data-id="root"]',
      'textarea',
      'div[role="textbox"]',
    ];

    console.log('🐯 AlbinoTiger: Checking selectors...');

    let target = null;
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      console.log(`🐯 AlbinoTiger: Selector "${selector}" found ${elements.length} elements`);

      if (elements.length > 0) {
        target = elements[0];
        console.log('🐯 AlbinoTiger: ✓ Found target with selector:', selector);
        console.log('🐯 AlbinoTiger: Target element:', target);
        console.log('🐯 AlbinoTiger: Target tagName:', target.tagName);
        console.log('🐯 AlbinoTiger: Target contentEditable:', target.contentEditable);
        break;
      }
    }

    if (!target) {
      console.error('🐯 AlbinoTiger: ✗ Could not find chat input');
      alert('AlbinoTiger Error: Could not find the chat input. Please click on the chat box and try again.');
      return;
    }

    console.log('🐯 AlbinoTiger: Focusing target...');
    target.focus();

    if (target.contentEditable === 'true' || target.classList.contains('ProseMirror')) {
      console.log('🐯 AlbinoTiger: Target is contenteditable, setting textContent');
      target.textContent = text;

      const events = ['input', 'change', 'keyup', 'keydown'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        target.dispatchEvent(event);
        console.log('🐯 AlbinoTiger: Dispatched', eventType, 'event');
      });

      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      });
      target.dispatchEvent(inputEvent);
      console.log('🐯 AlbinoTiger: Dispatched InputEvent');

    } else {
      console.log('🐯 AlbinoTiger: Target is textarea, setting value');
      target.value = text;

      const events = ['input', 'change', 'keyup', 'keydown'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        target.dispatchEvent(event);
        console.log('🐯 AlbinoTiger: Dispatched', eventType, 'event');
      });
    }

    console.log('🐯 AlbinoTiger: ✓ Text pasted successfully');
    console.log('🐯 AlbinoTiger: Current target content length:', target.textContent?.length || target.value?.length || 0);
    
    // EDITED: Reset prompt if Once mode is enabled
    if (state.onceMode && state.toggledPrompts.size > 0) {
      state.toggledPrompts.clear();
      renderPromptSelector();
      saveState();
      console.log('🐯 AlbinoTiger: Once mode - prompt reset to None');
    }
  }

  // 6. --- INITIALIZATION ---

  function initialize() {
    console.log('🐯 AlbinoTiger: Initializing...');
    loadState();
    injectUI();
    updateAllUI();
    addListeners();
    console.log('🐯 AlbinoTiger: ✓ Initialization complete');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    initialize();
  } else {
    window.addEventListener('DOMContentLoaded', initialize);
  }

})();