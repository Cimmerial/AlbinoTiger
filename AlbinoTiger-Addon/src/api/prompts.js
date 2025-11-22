// AlbinoTiger-Addon/src/api/prompts.js
/**
 * Prompt loading and caching
 */

const promptCache = new Map();

async function loadPromptContent(fileName) {
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