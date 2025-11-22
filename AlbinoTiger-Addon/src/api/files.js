// AlbinoTiger-Addon/src/api/files.js
/**
 * File search and retrieval operations
 */

function fuzzyMatch(search, target) {
  search = search.toLowerCase();
  target = target.toLowerCase();

  if (target.includes(search)) return { match: true, priority: target.indexOf(search) === 0 ? 0 : 1 };

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

async function searchFiles(query) {
  if (!state.serverOnline) {
    console.log('🐯 AlbinoTiger: Server offline, skipping search');
    return;
  }

  try {
    console.log('🐯 AlbinoTiger: Searching for files with query:', query);
    const appConfig = PROMPT_LIBRARY[state.currentApp];
    const rootDir = appConfig?.rootDir || '';
    const url = `${AT_CONFIG.SERVER_URL}/search?q=${encodeURIComponent(query)}&root=${encodeURIComponent(rootDir)}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    let files = await response.json();
    console.log('🐯 AlbinoTiger: Found', files.length, 'entries:', files);

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
    state.serverOnline = false;
    updateFileSearchState();
    state.foundFiles = [];
    renderFileList();
  }
}

async function getFileContent(filePath) {
  try {
    console.log('🐯 AlbinoTiger: Fetching file content for:', filePath);
    const url = `${AT_CONFIG.SERVER_URL}/file?path=${encodeURIComponent(filePath)}`;
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

async function isFolderFullySelected(folderPath) {
  try {
    const url = `${AT_CONFIG.SERVER_URL}/folder-contents?path=${encodeURIComponent(folderPath)}`;
    const response = await fetch(url);
    if (!response.ok) return false;

    const filesInFolder = await response.json();
    if (filesInFolder.length === 0) return false;

    return filesInFolder.every(file => state.selectedFiles.has(file));
  } catch (err) {
    return false;
  }
}

async function handleFolderToggle(folderPath, isChecked, enableFiles = true) {
  try {
    console.log(`🐯 AlbinoTiger: Fetching contents for folder: ${folderPath}`);
    const url = `${AT_CONFIG.SERVER_URL}/folder-contents?path=${encodeURIComponent(folderPath)}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const filesInFolder = await response.json();
    console.log(`🐯 AlbinoTiger: Folder contains ${filesInFolder.length} files.`);

    if (isChecked) {
      filesInFolder.forEach(file => {
        state.selectedFiles.add(file);
        if (enableFiles) {
          state.enabledFiles.add(file);
        }
      });
      console.log(`🐯 AlbinoTiger: Added ${filesInFolder.length} files (enabled: ${enableFiles}).`);
    } else {
      filesInFolder.forEach(file => {
        state.selectedFiles.delete(file);
        state.enabledFiles.delete(file);
      });
      console.log(`🐯 AlbinoTiger: Removed ${filesInFolder.length} files from selection.`);
    }

    saveState();

  } catch (err) {
    console.error('🐯 AlbinoTiger: Error fetching folder contents:', err);
    if (typeof showToast === 'function') {
      showToast(`Error: Could not get contents for folder ${folderPath}.`, 'error');
    } else {
      alert(`AlbinoTiger Error: Could not get contents for folder ${folderPath}.`);
    }
  }
}