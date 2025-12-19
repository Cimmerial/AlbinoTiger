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
    'General': {
        rootDir: '',
        prompts: [
            { id: 'general_coding', label: 'Coding', file: 'general-coding.md' },
            { id: 'general_learning', label: 'Learning', file: 'general-learning.md' },
            { id: 'general_idea', label: 'Idea', file: 'general-idea.md' },
        ],
    },
    'Cyanotype': {
        rootDir: 'Cyanotype',
        prompts: [
            { id: 'cyanotype_master', label: 'Default', file: 'cyanotype-master.md' },
            { id: 'cyanotype_architect', label: 'Architect', file: 'cyanotype-architect.md' },
            { id: 'cyanotype_refactor', label: 'Refactor', file: 'cyanotype-refactor.md' },
        ],
    },
    'AlbinoTiger': {
        rootDir: 'AlbinoTiger',
        prompts: [
            { id: 'dev_thorough', label: 'Thorough', file: 'at-dev-thorough.md' },
            { id: 'dev_quick', label: 'Quick', file: 'at-dev-quick.md' },
        ],
    },
    'Trading': {
        rootDir: '',
        prompts: [
            { id: 'depth_trading', label: 'Trading Deep', file: 'depth-trading.md' },
            { id: 'quick_trading', label: 'Trading Quick', file: 'quick-trading.md' },
        ],
    },
};

const INITIAL_STATE = {
    currentApp: 'General',
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
    isLoadingFiles: false,
    totalFileChars: 0,
};