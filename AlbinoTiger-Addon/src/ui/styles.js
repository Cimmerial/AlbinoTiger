// AlbinoTiger-Addon/src/ui/styles.js
/**
 * CSS styles for AlbinoTiger modal
 */

const AT_STYLES = `
  :root {
    --at-primary: #f59e0b;
    --at-primary-dark: #d97706;
    --at-primary-light: #fbbf24;
    --at-bg: #18181b;
    --at-bg-alt: #27272a;
    --at-bg-light: #3f3f46;
    --at-text: #fafafa;
    --at-text-dim: #a1a1aa;
    --at-border: #3f3f46;
    --at-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  }

  #at-modal {
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
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1), max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s ease;
    user-select: none;
    overflow: hidden;
  }

  #at-custom-prompt {
    user-select: text;
  }

  #at-modal.search-focused {
    width: 550px;
    max-height: 690px;
  }

  #at-modal[data-visible="false"] {
    width: 185px;
    max-height: 40px;
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

  #at-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    border-bottom: 2px solid #f59e0b;
    background: #0a0a0a;
    border-radius: 10px 10px 0 0;
    cursor: pointer;
    user-select: none;
    min-height: 20px;
  }

  #at-header h3 {
    margin: 0;
    margin-right: 8px;
    font-size: 13px;
    font-weight: 700;
    color: #fbbf24;
    letter-spacing: 0.5px;
    line-height: 1;
    font-family: "Courier New", Courier, "Lucida Console", Monaco, monospace;
  }

  #at-toggle-modal {
    cursor: pointer;
    font-weight: bold;
    width: 20px;
    height: 20px;
    border-radius: 4px;
    background: rgba(251, 191, 36, 0.2);
    color: #fbbf24;
    font-size: 14px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    flex-shrink: 0;
  }

  #at-toggle-modal:hover {
    background: rgba(251, 191, 36, 0.4);
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

  .at-once-toggle {
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
    min-height: 75px;
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

  #at-file-search-input:disabled {
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

  .at-file-item.folder-selected {
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
    cursor: pointer;
  }

  .at-file-item-path {
    color: var(--at-text-dim);
    font-size: 9px;
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .at-file-item-controls {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-left: auto;
  }

  .at-file-select-off {
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

  .at-file-select-off.active {
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

  .at-selected-file-tag {
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

  .at-selected-file-tag.disabled {
    opacity: 0.4;
    background: #27272a;
  }

  .at-selected-file-tag:hover {
    background: #52525b;
    border-color: #71717a;
  }

  .at-selected-file-tag.disabled:hover {
    background: #3f3f46;
  }

  .at-file-toggle-btn {
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid #71717a;
    background: transparent;
    cursor: pointer;
    transition: all 0.2s;
    flex-shrink: 0;
  }

  .at-file-toggle-btn.active {
    background: var(--at-primary);
    border-color: var(--at-primary);
  }

  .at-file-toggle-btn.offline {
    cursor: not-allowed;
    opacity: 0.4;
  }

  .at-file-remove {
    cursor: pointer;
    font-weight: bold;
    font-size: 12px;
    line-height: 1;
    padding: 0 2px;
    opacity: 0;
    transition: opacity 0.2s;
  }

  .at-file-remove:hover {
    opacity: 1;
    color: #ef4444;
  }

  #at-footer {
    padding: 12px;
    border-top: 2px solid var(--at-border);
    background: var(--at-bg);
    border-radius: 0 0 10px 10px;
  }

  .at-button-row {
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

  #at-go-button {
    flex: 2;
    background: linear-gradient(135deg, #b45309 0%, #92400e 100%);
  }

  #at-go-button:hover {
    box-shadow: 0 4px 12px rgba(180, 83, 9, 0.4);
    background: linear-gradient(135deg, #d97706 0%, #b45309 100%);
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