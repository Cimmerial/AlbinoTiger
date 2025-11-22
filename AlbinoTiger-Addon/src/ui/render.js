// AlbinoTiger-Addon/src/ui/render.js
/**
 * UI rendering functions
 */

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
  
    let selectedLabel = 'None';
    if (state.toggledPrompts.size > 0) {
      const selectedId = Array.from(state.toggledPrompts)[0];
      const selectedPrompt = prompts.find(p => p.id === selectedId);
      if (selectedPrompt) selectedLabel = selectedPrompt.label;
    }
    selected.textContent = selectedLabel;
  
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
  
      const checkboxChecked = isSelected || isFolderFull;
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
  
  async function renderSelectedFiles() {
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
      const isOffline = !state.serverOnline;
  
      const tag = document.createElement('div');
      tag.className = 'at-selected-file-tag' + (isEnabled ? '' : ' disabled');
      tag.innerHTML = `
        <span class="at-file-toggle-btn ${isEnabled ? 'active' : ''} ${isOffline ? 'offline' : ''}" data-path="${filePath}" title="${isOffline ? 'Server offline' : 'Toggle file'}"></span>
        <span>${name}</span>
        <span class="at-file-remove" data-path="${filePath}" title="Remove file">×</span>
      `;
      container.appendChild(tag);
    });
  
    if (statsEl) {
      const enabledCount = state.enabledFiles.size;
      const totalCount = state.selectedFiles.size;
      statsEl.innerHTML = `(${enabledCount}/${totalCount}, counting...)`;
  
      let totalLines = 0;
      for (const filePath of state.enabledFiles) {
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
  
      if (state.enabledFiles.size > 0) {
        state.savedEnabledFiles = new Set(state.enabledFiles);
        state.enabledFiles.clear();
        saveState();
        renderSelectedFiles();
      }
    }
  }
  
  async function updateAllUI() {
    renderAppSelector();
    renderPromptSelector();
    await renderFileList();
    await renderSelectedFiles();
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