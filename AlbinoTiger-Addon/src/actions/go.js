// AlbinoTiger-Addon/src/actions/go.js
/**
 * GO button action - combines prompts and files
 */

async function constructFinalPrompt() {
  const finalPrompt = [];
  const hasCustomPrompt = state.customPrompt.trim().length > 0;
  const hasAppPrompts = state.toggledPrompts.size > 0;

  // 1. Add Custom Prompt
  if (hasCustomPrompt) {
    console.log('🐯 AlbinoTiger: Adding custom prompt');
    finalPrompt.push(state.customPrompt.trim());
  }

  // 2. Add authority divider if both custom and app prompts exist
  if (hasCustomPrompt && hasAppPrompts) {
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
  }

  // 3. Add Predefined Prompts
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

  // 4. Add Files
  if (state.enabledFiles.size > 0) {
    console.log('🐯 AlbinoTiger: Fetching', state.enabledFiles.size, 'enabled files');
    const fileContents = [];
    const sortedFiles = Array.from(state.enabledFiles).sort();

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
    return null;
  }

  return finalPrompt.join('\n\n====================\n\n');
}

async function onGoButtonClick(autoSend = true) {
  console.log('🐯 AlbinoTiger: ===== GO BUTTON CLICKED =====');
  console.log('🐯 AlbinoTiger: Auto-send:', autoSend);

  state.isSearchFocused = false;
  document.getElementById('at-modal').classList.remove('search-focused');

  const combinedPrompt = await constructFinalPrompt();

  if (!combinedPrompt) {
    console.log('🐯 AlbinoTiger: No content to paste');
    showToast('No prompts or files selected.', 'error');
    return;
  }

  console.log('🐯 AlbinoTiger: Final prompt created, length:', combinedPrompt.length);
  console.log('🐯 AlbinoTiger: First 200 chars:', combinedPrompt.substring(0, 200));

  pasteTextIntoChat(combinedPrompt, autoSend);
}