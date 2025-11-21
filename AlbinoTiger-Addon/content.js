/**
 * AlbinoTiger v0.3.0
 * Smaller UI, better paste detection, more console logging
 */

(function() {
  console.log('🐯 AlbinoTiger: Extension loaded');
  
  // 1. --- STATE & CONFIGURATION ---

  const PROMPT_LIBRARY = {
    'GAME1': [
      { id: 'g1_init', label: 'Initialize Game Loop', prompt: 'Set up the main game loop, requestAnimationFrame, and canvas context.' },
      { id: 'g1_physics', label: 'Physics Engine', prompt: 'Add a simple physics engine for collision detection (AABB).' },
      { id: 'g1_player', label: 'Player Controls', prompt: 'Create the player object and add keyboard controls (W, A, S, D).' },
    ],
    'GAME2': [
      { id: 'g2_assets', label: 'Asset Loading', prompt: 'Write a function to preload all image and audio assets.' },
      { id: 'g2_ui', label: 'Main Menu UI', prompt: 'Create the HTML/CSS for the main menu screen.' },
      { id: 'g2_state', label: 'State Manager', prompt: 'Implement a simple state manager (e.g., MENU, PLAYING, GAME_OVER).' },
    ],
    'REACT_COMPONENT': [
      { id: 'rc_functional', label: 'Functional Component', prompt: 'Create a new React functional component named [Component] using TypeScript.' },
      { id: 'rc_tailwind', label: 'Add Tailwind', prompt: 'Style this component with Tailwind CSS.' },
      { id: 'rc_hook', label: 'Add `useState`', prompt: 'Import `useState` and add a state variable for...' },
    ],
  };

  // Load state from localStorage
  let state = {
    currentApp: 'GAME1',
    customPrompt: '',
    toggledPrompts: new Set(),
    foundFiles: [],
    selectedFiles: new Set(),
    isModalVisible: true,
  };
  
  // Load saved state
  function loadState() {
    try {
      const saved = localStorage.getItem('albinoTiger_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        state.currentApp = parsed.currentApp || 'GAME1';
        state.customPrompt = parsed.customPrompt || '';
        state.toggledPrompts = new Set(parsed.toggledPrompts || []);
        state.selectedFiles = new Set(parsed.selectedFiles || []);
        state.isModalVisible = parsed.isModalVisible !== undefined ? parsed.isModalVisible : true;
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
      }));
      console.log('🐯 AlbinoTiger: State saved');
    } catch (e) {
      console.error('🐯 AlbinoTiger: Error saving state', e);
    }
  }

  // 2. --- MODAL & UI INJECTION ---

  function injectUI() {
    console.log('🐯 AlbinoTiger: Injecting UI');
    
    // Inject Styles
    const styles = `
      :root {
        --at-primary: #0ea5e9;
        --at-primary-dark: #0284c7;
        --at-primary-light: #e0f2fe;
        --at-bg: #ffffff;
        --at-bg-alt: #f0f9ff;
        --at-text: #0c4a6e;
        --at-text-light: #075985;
        --at-border: #bae6fd;
        --at-shadow: 0 4px 20px rgba(14, 165, 233, 0.15);
      }
      
      #at-modal {
        position: fixed;
        bottom: 16px;
        right: 16px;
        width: 280px;
        max-height: 420px;
        background: var(--at-bg);
        border: 2px solid var(--at-border);
        border-radius: 10px;
        box-shadow: var(--at-shadow);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif;
        font-size: 12px;
        color: var(--at-text);
        z-index: 999999;
        display: flex;
        flex-direction: column;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
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
        padding: 8px 12px;
        border-bottom: 2px solid var(--at-border);
        background: linear-gradient(135deg, var(--at-primary) 0%, var(--at-primary-dark) 100%);
        border-radius: 8px 8px 0 0;
        cursor: pointer;
        user-select: none;
      }
      
      #at-header h3 {
        margin: 0;
        font-size: 13px;
        font-weight: 700;
        color: white;
        letter-spacing: 0.5px;
      }
      
      #at-toggle-modal {
        cursor: pointer;
        font-weight: bold;
        padding: 3px 7px;
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
        padding: 10px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 10px;
        background: var(--at-bg-alt);
      }
      
      .at-section { 
        display: flex; 
        flex-direction: column; 
        gap: 5px; 
      }
      
      .at-section-title { 
        font-weight: 600;
        margin: 0;
        color: var(--at-text);
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      #at-app-selector {
        width: 100%;
        padding: 6px 8px;
        border-radius: 6px;
        border: 2px solid var(--at-border);
        background: white;
        color: var(--at-text);
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      
      #at-app-selector:focus {
        outline: none;
        border-color: var(--at-primary);
        box-shadow: 0 0 0 2px var(--at-primary-light);
      }
      
      #at-prompt-toggles { 
        display: flex; 
        flex-direction: column; 
        gap: 3px; 
      }
      
      .at-toggle-label {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 8px;
        background: white;
        border: 1px solid var(--at-border);
        border-radius: 5px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 10px;
      }
      .at-toggle-label:hover { 
        background: var(--at-primary-light);
        border-color: var(--at-primary);
        transform: translateX(2px);
      }
      .at-toggle-label input { 
        margin: 0;
        cursor: pointer;
        width: 14px;
        height: 14px;
      }
      
      #at-custom-prompt {
        width: 100%;
        min-height: 50px;
        padding: 6px 8px;
        border-radius: 6px;
        border: 2px solid var(--at-border);
        resize: vertical;
        box-sizing: border-box;
        background: white;
        color: var(--at-text);
        font-size: 11px;
        font-family: inherit;
        transition: all 0.2s;
      }
      
      #at-custom-prompt:focus {
        outline: none;
        border-color: var(--at-primary);
        box-shadow: 0 0 0 2px var(--at-primary-light);
      }
      
      #at-file-search-input {
        width: 100%;
        padding: 6px 8px;
        border-radius: 6px;
        border: 2px solid var(--at-border);
        box-sizing: border-box;
        background: white;
        color: var(--at-text);
        font-size: 11px;
        transition: all 0.2s;
      }
      
      #at-file-search-input:focus {
        outline: none;
        border-color: var(--at-primary);
        box-shadow: 0 0 0 2px var(--at-primary-light);
      }
      
      #at-file-list {
        max-height: 100px;
        overflow-y: auto;
        border: 2px solid var(--at-border);
        border-radius: 6px;
        padding: 3px;
        background: white;
      }
      
      .at-file-item {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 4px 6px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 10px;
        transition: all 0.2s;
      }
      .at-file-item:hover { 
        background: var(--at-primary-light);
      }
      .at-file-item input {
        cursor: pointer;
      }
      .at-file-item strong {
        color: var(--at-text);
      }
      .at-file-item-path { 
        color: var(--at-text-light);
        margin-left: auto;
        font-size: 9px;
        opacity: 0.7;
      }
      
      #at-footer {
        padding: 10px;
        border-top: 2px solid var(--at-border);
        background: var(--at-bg-alt);
        border-radius: 0 0 8px 8px;
      }
      
      #at-go-button {
        width: 100%;
        padding: 8px;
        font-size: 12px;
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
    `;
    const styleSheet = document.createElement("style");
    styleSheet.type = "text/css";
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);

    // Inject HTML
    const modalHTML = `
      <div id="at-modal" data-visible="true">
        <div id="at-header">
          <h3>ALBINO TIGER</h3>
          <div id="at-toggle-modal" title="Toggle Modal">−</div>
        </div>
        
        <div id="at-body">
          <div class="at-section">
            <label for="at-app-selector" class="at-section-title">App Profile</label>
            <select id="at-app-selector"></select>
          </div>
          
          <div class="at-section">
            <div id="at-prompt-toggles"></div>
          </div>
          
          <div class="at-section">
            <label for="at-custom-prompt" class="at-section-title">Custom Prompt</label>
            <textarea id="at-custom-prompt" placeholder="Add a custom prompt..."></textarea>
          </div>
          
          <div class="at-section">
            <label for="at-file-search-input" class="at-section-title">Project Files</label>
            <input type="text" id="at-file-search-input" placeholder="Search (press Enter)">
            <div id="at-file-list">
              <div style="padding: 6px; color: var(--at-text-light); text-align: center; font-size: 10px;">Search to find files...</div>
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

  function renderPromptToggles() {
    const container = document.getElementById('at-prompt-toggles');
    container.innerHTML = '';
    const prompts = PROMPT_LIBRARY[state.currentApp] || [];
    
    if (prompts.length === 0) {
      container.innerHTML = `<div style="color: var(--at-text-light); font-size: 10px;">No prompts for this profile.</div>`;
      return;
    }

    prompts.forEach(prompt => {
      const isChecked = state.toggledPrompts.has(prompt.id);
      const label = document.createElement('label');
      label.className = 'at-toggle-label';
      label.innerHTML = `
        <input type="checkbox" class="at-prompt-toggle" data-id="${prompt.id}" ${isChecked ? 'checked' : ''}>
        <span>${prompt.label}</span>
      `;
      container.appendChild(label);
    });
  }
  
  function renderFileList() {
    const container = document.getElementById('at-file-list');
    container.innerHTML = '';
    
    if (state.foundFiles.length === 0) {
      container.innerHTML = `<div style="padding: 6px; color: var(--at-text-light); text-align: center; font-size: 10px;">No files found.</div>`;
      return;
    }
    
    state.foundFiles.forEach(filePath => {
      const isChecked = state.selectedFiles.has(filePath);
      const parts = filePath.split(/[/\\]/);
      const fileName = parts.pop();
      const dirPath = parts.join('/');
      
      const item = document.createElement('div');
      item.className = 'at-file-item';
      item.dataset.path = filePath;
      item.innerHTML = `
        <input type="checkbox" class="at-file-toggle" data-path="${filePath}" ${isChecked ? 'checked' : ''}>
        <strong>${fileName}</strong>
        <span class="at-file-item-path">${dirPath}</span>
      `;
      container.appendChild(item);
    });
  }

  function updateAllUI() {
    renderAppSelector();
    renderPromptToggles();
    renderFileList();
    
    // Restore custom prompt
    document.getElementById('at-custom-prompt').value = state.customPrompt;
    
    // Set modal visibility
    document.getElementById('at-modal').dataset.visible = state.isModalVisible;
    document.getElementById('at-toggle-modal').textContent = state.isModalVisible ? '−' : '+';
  }

  // 4. --- EVENT LISTENERS ---

  function addListeners() {
    console.log('🐯 AlbinoTiger: Adding event listeners');
    
    // Header click to toggle
    document.getElementById('at-header').addEventListener('click', (e) => {
      if (e.target.id !== 'at-toggle-modal') {
        state.isModalVisible = !state.isModalVisible;
        document.getElementById('at-modal').dataset.visible = state.isModalVisible;
        document.getElementById('at-toggle-modal').textContent = state.isModalVisible ? '−' : '+';
        saveState();
      }
    });
    
    // Toggle button
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
      renderPromptToggles();
      saveState();
    });
    
    // Custom Prompt
    document.getElementById('at-custom-prompt').addEventListener('input', (e) => {
      state.customPrompt = e.target.value;
      saveState();
    });
    
    // Predefined Prompts
    document.getElementById('at-prompt-toggles').addEventListener('change', (e) => {
      if (e.target.classList.contains('at-prompt-toggle')) {
        const id = e.target.dataset.id;
        console.log('🐯 AlbinoTiger: Prompt toggled', id, e.target.checked);
        if (e.target.checked) {
          state.toggledPrompts.add(id);
        } else {
          state.toggledPrompts.delete(id);
        }
        saveState();
      }
    });
    
    // File Search
    document.getElementById('at-file-search-input').addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const query = e.target.value.trim();
        console.log('🐯 AlbinoTiger: File search triggered with query:', query);
        if (!query) {
          state.foundFiles = [];
          renderFileList();
          return;
        }
        await searchFiles(query);
      }
    });
    
    // File Selection
    document.getElementById('at-file-list').addEventListener('click', (e) => {
      const item = e.target.closest('.at-file-item');
      if (item) {
        const path = item.dataset.path;
        const checkbox = item.querySelector('.at-file-toggle');
        
        if (e.target !== checkbox) {
          checkbox.checked = !checkbox.checked;
        }
        
        console.log('🐯 AlbinoTiger: File toggled', path, checkbox.checked);
        if (checkbox.checked) {
          state.selectedFiles.add(path);
        } else {
          state.selectedFiles.delete(path);
        }
        saveState();
      }
    });

    // GO Button
    document.getElementById('at-go-button').addEventListener('click', onGoButtonClick);
    
    console.log('🐯 AlbinoTiger: Event listeners added');
  }

  // 5. --- CORE LOGIC ---

  async function searchFiles(query) {
    try {
      console.log('🐯 AlbinoTiger: Searching for files with query:', query);
      const url = `http://localhost:12345/search?q=${encodeURIComponent(query)}`;
      console.log('🐯 AlbinoTiger: Fetch URL:', url);
      
      const response = await fetch(url);
      console.log('🐯 AlbinoTiger: Server response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }
      
      const files = await response.json();
      console.log('🐯 AlbinoTiger: Found', files.length, 'files:', files);
      
      state.foundFiles = files;
      state.selectedFiles = new Set(
        [...state.selectedFiles].filter(file => files.includes(file))
      );
      renderFileList();
    } catch (err) {
      console.error('🐯 AlbinoTiger: Error searching files:', err);
      alert('AlbinoTiger Error: Could not connect to local server. Make sure it\'s running on port 12345.');
      state.foundFiles = [];
      renderFileList();
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
    const finalPrompt = [];
    
    // 1. Add Custom Prompt
    if (state.customPrompt.trim()) {
      console.log('🐯 AlbinoTiger: Adding custom prompt');
      finalPrompt.push(state.customPrompt.trim());
    }
    
    // 2. Add Predefined Prompts
    const currentAppPrompts = PROMPT_LIBRARY[state.currentApp] || [];
    state.toggledPrompts.forEach(id => {
      const prompt = currentAppPrompts.find(p => p.id === id);
      if (prompt) {
        console.log('🐯 AlbinoTiger: Adding predefined prompt:', prompt.label);
        finalPrompt.push(prompt.prompt);
      }
    });
    
    // 3. Add Files
    if (state.selectedFiles.size > 0) {
      console.log('🐯 AlbinoTiger: Fetching', state.selectedFiles.size, 'files');
      const fileContents = [];
      for (const filePath of state.selectedFiles) {
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
    
    // Try multiple selectors for different AI chat interfaces
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
    
    // Handle contenteditable divs (Claude)
    if (target.contentEditable === 'true' || target.classList.contains('ProseMirror')) {
      console.log('🐯 AlbinoTiger: Target is contenteditable, setting textContent');
      target.textContent = text;
      
      // Trigger multiple events to ensure detection
      const events = ['input', 'change', 'keyup', 'keydown'];
      events.forEach(eventType => {
        const event = new Event(eventType, { bubbles: true });
        target.dispatchEvent(event);
        console.log('🐯 AlbinoTiger: Dispatched', eventType, 'event');
      });
      
      // Also try InputEvent
      const inputEvent = new InputEvent('input', {
        bubbles: true,
        cancelable: true,
        inputType: 'insertText',
        data: text
      });
      target.dispatchEvent(inputEvent);
      console.log('🐯 AlbinoTiger: Dispatched InputEvent');
      
    } else {
      // Handle textareas
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