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
 * Endpoint to search for files.
 * Uses glob pattern for flexible matching.
 * Example: /search?q=main.js
 * /search?q=*component.tsx
 */
app.get('/search', async (req, res) => {
  const query = req.query.q || '';
  
  if (!query) {
    return res.status(400).json({ error: 'Missing query parameter "q"' });
  }

  try {
    // Use fast-glob to search. We add '*' to make it a wildcard search.
    const searchPattern = `**/*${query}*`;
    console.log(`Searching for: ${searchPattern} in ${PROJECT_DIR}`);
    
    const entries = await fg(searchPattern, { 
      cwd: PROJECT_DIR, 
      onlyFiles: true,
      ignore: ['**/node_modules/**', '**/.git/**', '**/Library/**', '**/Temp/**'], // Ignore common large folders
      absolute: false // Get relative paths
    });
    
    console.log(`Found ${entries.length} files`);
    
    // Return the first 20 matches
    res.json(entries.slice(0, 20));

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search for files.' });
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
    // Resolve the absolute path and ensure it is *still inside* the PROJECT_DIR.
    // This prevents directory traversal attacks (e.g., /file?path=../../etc/passwd)
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