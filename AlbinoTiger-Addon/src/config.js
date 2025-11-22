// AlbinoTiger-Addon/src/config.js
/**
 * Configuration and constants for AlbinoTiger
 */

const AT_CONFIG = {
    SERVER_URL: 'http://localhost:12345',
    SERVER_CHECK_INTERVAL: 5000,
    DEBOUNCE_DELAY: 300,
    VERSION: '0.6.0'
  };
  
  const PROMPT_LIBRARY = {
    'AlbinoTiger': {
      rootDir: 'AlbinoTiger',
      prompts: [
        { id: 'dev_thorough', label: 'Thorough', file: 'at-dev-thorough.md' },
        { id: 'dev_quick', label: 'Quick', file: 'at-dev-quick.md' },
      ],
    },
    'General': {
      rootDir: 'AlbinoTiger',
      prompts: [
        { id: 'general_learning', label: 'Learning', file: 'general-learning.md' },
        { id: 'general_coding', label: 'Coding', file: 'general-coding.md' },
      ],
    },
  };
  
  const INITIAL_STATE = {
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