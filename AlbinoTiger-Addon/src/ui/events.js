// AlbinoTiger-Addon/src/ui/events.js
/**
 * Event listener setup
 */

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
        state.selectedFiles.clear();
        renderAppSelector();
        renderPromptSelector();
        renderSelectedFiles();
        saveState();
        appDropdown.classList.remove('open');
      }
    });
  
    // Prompt Selector
    const promptDropdown = document.getElementById('at-prompt-dropdown');
    const promptSelected = document.getElementById('at-prompt-selected');
    const promptOptions = document.getElementById('at-prompt-options');
  
    promptSelected.addEventListener('click', (e) => {
      e.stopPropagation();
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
  
    document.getElementById('at-custom-prompt').addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        document.getElementById('at-modal').classList.remove('search-focused');
        state.isSearchFocused = false;
        onGoButtonClick(true);
      }
    });
  
    // Once Mode Toggle
    document.getElementById('at-once-checkbox').addEventListener('change', (e) => {
      state.onceMode = e.target.checked;
      saveState();
    });
  
    // Click outside modal to collapse search
    document.addEventListener('click', (e) => {
      const modal = document.getElementById('at-modal');
      if (!modal.contains(e.target)) {
        if (state.isSearchFocused) {
          state.isSearchFocused = false;
          modal.classList.remove('search-focused');
        }
      }
      if (!e.target.closest('.at-dropdown')) {
        document.querySelectorAll('.at-dropdown.open').forEach(d => d.classList.remove('open'));
      }
    });
  
    // File Search
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
    }, AT_CONFIG.DEBOUNCE_DELAY);
  
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      debouncedSearch(query);
    });
  
    // File List
    document.getElementById('at-file-list').addEventListener('click', async (e) => {
      const item = e.target.closest('.at-file-item');
      if (!item) return;
  
      const path = item.dataset.path;
      const type = item.dataset.type;
      const checkboxOn = item.querySelector('.at-file-toggle-on');
  
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
  
      if (e.target.classList.contains('at-file-select-off')) {
        e.stopPropagation();
  
        if (type === 'file') {
          if (!state.selectedFiles.has(path)) {
            state.selectedFiles.add(path);
          } else {
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
          try {
            const url = `${AT_CONFIG.SERVER_URL}/folder-contents?path=${encodeURIComponent(path)}`;
            const response = await fetch(url);
            if (response.ok) {
              const filesInFolder = await response.json();
              const allSelected = filesInFolder.every(f => state.selectedFiles.has(f));
  
              if (!allSelected) {
                filesInFolder.forEach(f => {
                  state.selectedFiles.add(f);
                  state.enabledFiles.delete(f);
                });
              } else {
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
  
    // Selected Files
    document.getElementById('at-selected-files').addEventListener('click', (e) => {
      e.stopPropagation();
  
      if (e.target.classList.contains('at-file-toggle-btn')) {
        if (!state.serverOnline) {
          console.log('🐯 AlbinoTiger: Cannot toggle files while server offline');
          return;
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
      onGoButtonClick(true);
    });
  
    // SLOW Button
    document.getElementById('at-slow-button').addEventListener('click', () => {
      document.getElementById('at-modal').classList.remove('search-focused');
      state.isSearchFocused = false;
      onGoButtonClick(false);
    });
  
    // Clear Button
    document.getElementById('at-clear-button').addEventListener('click', () => {
      clearChatInput();
    });
  
    console.log('🐯 AlbinoTiger: Event listeners added');
  }