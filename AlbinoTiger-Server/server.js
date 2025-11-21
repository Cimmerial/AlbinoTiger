// AlbinoTiger-Server/server.js
const express = require('express');
const cors = require('cors');
const fg = require('fast-glob');
const fs = require('fs/promises');
const fsSync = require('fs'); // Add synchronous fs for existsSync
const path = require('path');
const os = require('os');

const app = express();
const PORT = 12345;

// --- IMPORTANT ---
// Default starting directory
const USER_HOME = os.homedir();
let PROJECT_DIR = path.join(USER_HOME, 'Downloads', 'Non-icloud Repos');
// --- IMPORTANT ---

// Use CORS to allow requests from the browser
app.use(cors({
  origin: '*', // Allow all origins for local development
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

// Middleware to parse JSON bodies (for POST requests)
app.use(express.json());

console.log('--- AlbinoTiger Server ---');
console.log(`Default directory: ${PROJECT_DIR}`);
if (!fsSync.existsSync(PROJECT_DIR)) {
  console.warn('WARNING: The default PROJECT_DIR does not exist.');
}

// Common ignore patterns for glob
const IGNORE_PATTERNS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/Library/**',
  '**/Temp/**',
  '**/.DS_Store/**',
  '**/dist/**',
  '**/build/**',
];

/**
 * Endpoint to get the current project directory
 * GET /directory
 */
app.get('/directory', (req, res) => {
  res.json({
    directory: PROJECT_DIR,
    exists: fsSync.existsSync(PROJECT_DIR)
  });
});

/**
 * Endpoint to set a new project directory
 * POST /directory
 * Body: { "path": "/path/to/new/directory" }
 */
app.post('/directory', (req, res) => {
  const newPath = req.body.path;

  if (!newPath) {
    return res.status(400).json({ error: 'Missing "path" in request body' });
  }

  // Resolve to absolute path
  const absPath = path.resolve(newPath);

  // Check if it exists
  if (!fsSync.existsSync(absPath)) {
    return res.status(404).json({
      error: 'Directory does not exist',
      path: absPath
    });
  }

  // Check if it's a directory
  if (!fsSync.statSync(absPath).isDirectory()) {
    return res.status(400).json({
      error: 'Path is not a directory',
      path: absPath
    });
  }

  PROJECT_DIR = absPath;
  console.log(`✓ Project directory changed to: ${PROJECT_DIR}`);

  res.json({
    success: true,
    directory: PROJECT_DIR
  });
});

/**
 * UPDATED: Endpoint to search for files AND folders.
 * Uses glob pattern for flexible matching.
 * Example: /search?q=main.js
 * /search?q=components
 */
app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  const rootSubdir = req.query.root || ''; // EDITED: Optional root subdirectory

  if (!query) {
    return res.json([]);
  }

  try {
    // EDITED: Calculate search directory with optional root
    let searchDir = PROJECT_DIR;
    if (rootSubdir) {
      const subPath = path.resolve(PROJECT_DIR, rootSubdir);
      // Security check
      if (subPath.startsWith(PROJECT_DIR) && fsSync.existsSync(subPath)) {
        searchDir = subPath;
      }
    }
    
    const caseInsensitiveQuery = query.split('').map(c => {
      if (c.match(/[a-zA-Z]/)) {
        return `[${c.toLowerCase()}${c.toUpperCase()}]`;
      }
      return c;
    }).join('');
    const searchPattern = `**/*${caseInsensitiveQuery}*`;
    console.log(`Searching for: ${searchPattern} in ${searchDir}`);

    const entries = await fg(searchPattern, {
      cwd: searchDir,
      onlyFiles: false, // EDITED: Find both files and folders
      onlyDirectories: false,
      markDirectories: true,
      ignore: IGNORE_PATTERNS,
      absolute: false
    });

    console.log(`Found ${entries.length} entries`);

    // EDITED: Prepend rootSubdir to paths if used
    const results = rootSubdir 
      ? entries.map(e => path.posix.join(rootSubdir, e))
      : entries;

    res.json(results.slice(0, 20));

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search for files.' });
  }
});

/**
 * NEW: Endpoint to get all file contents within a folder
 * Example: /folder-contents?path=src/components
 */
app.get('/folder-contents', async (req, res) => {
  const relPath = req.query.path || '';

  if (!relPath) {
    return res.status(400).json({ error: 'Missing query parameter "path"' });
  }

  try {
    // Security check:
    // Resolve the absolute path and ensure it is *still inside* the PROJECT_DIR.
    const absPath = path.resolve(path.join(PROJECT_DIR, relPath));

    if (!absPath.startsWith(PROJECT_DIR)) {
      console.warn(`Forbidden access attempt: ${relPath}`);
      return res.status(403).send('Forbidden: Access denied.');
    }
    
    // Check if it's actually a directory
    if (!fsSync.existsSync(absPath) || !fsSync.statSync(absPath).isDirectory()) {
      return res.status(404).send('Directory not found.');
    }

    console.log(`Globbing folder: ${absPath}`);

    // Find all files inside this folder, recursively
    const entries = await fg('**/*', {
      cwd: absPath,
      onlyFiles: true,
      ignore: IGNORE_PATTERNS,
      absolute: false,
    });
    
    // Join the relative path of the folder with the file paths found inside
    // This ensures the client gets the full relative path from PROJECT_DIR
    const fullRelativePaths = entries.map(entry => {
      // Use path.posix.join to ensure forward slashes, which the client expects
      return path.posix.join(relPath, entry);
    });

    console.log(`Found ${fullRelativePaths.length} files in folder`);
    res.json(fullRelativePaths);

  } catch (err) {
    console.error('Folder glob error:', err);
    res.status(500).send('Failed to get folder contents.');
  }
});


/**
 * Endpoint to get the content of a specific file.
 * Example: /file?path=src/components/Button.tsx
 */
app.get('/file', async (req, res) => {
  const relPath = req.query.path || '';

  if (!relPath) {
    return res.status(400).json({ error: 'Missing query parameter "path"' });
  }

  try {
    // Security check:
    const absPath = path.resolve(path.join(PROJECT_DIR, relPath));

    if (!absPath.startsWith(PROJECT_DIR)) {
      console.warn(`Forbidden access attempt: ${relPath}`);
      return res.status(403).send('Forbidden: Access denied.');
    }

    const content = await fs.readFile(absPath, 'utf-8');
    res.send(content);

  } catch (err) {
    if (err.code === 'ENOENT') {
      res.status(404).send('File not found.');
    } else {
      console.error('File read error:', err);
      res.status(500).send('Failed to read file.');
    }
  }
});

app.listen(PORT, 'localhost', () => {
  console.log(`Server listening on http://localhost:${PORT}`);
  console.log('Ready to connect with the AlbinoTiger addon.');
  console.log('\nCommands:');
  console.log('  - View current directory: GET http://localhost:12345/directory');
  console.log('  - Change directory: POST http://localhost:12345/directory with {"path": "/new/path"}');
});