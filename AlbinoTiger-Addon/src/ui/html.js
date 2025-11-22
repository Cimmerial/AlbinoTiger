// AlbinoTiger-Addon/src/ui/html.js
/**
 * HTML template for AlbinoTiger modal
 */

const AT_MODAL_HTML = `
  <div id="at-modal" data-visible="true">
    <div id="at-header">
      <h3 style="display: flex; align-items: center; gap: 6px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/>
          <path d="M8 14v.5"/>
          <path d="M16 14v.5"/>
          <path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/>
        </svg>
        ALB1NO T1GER
      </h3>
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
        <label class="at-section-title">Selected Files <span id="at-selected-stats" style="font-weight: 400; color: var(--at-text-dim);"></span></label>
        <div id="at-selected-files">
          <div style="width: 100%; text-align: center; color: var(--at-text-dim); font-size: 10px;">No files selected</div>
        </div>
      </div>
    </div>
    
    <div id="at-footer">
      <div class="at-button-row">
        <button id="at-go-button" class="at-btn">GO</button>
        <button id="at-slow-button" class="at-btn">SLOW</button>
        <button id="at-clear-button" class="at-btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18"/>
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            <line x1="10" x2="10" y1="11" y2="17"/>
            <line x1="14" x2="14" y1="11" y2="17"/>
          </svg>
        </button>
      </div>
    </div>
  </div>
`;