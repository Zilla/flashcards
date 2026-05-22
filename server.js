import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
const PORT = process.env.PORT || 3001;

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

const CONFIG_FILE = path.join(process.cwd(), 'config.json');
const DEFAULT_DATA_DIR = path.join(process.cwd(), 'data');

// Ensure default data dir exists
async function ensureDir(dirPath) {
  try {
    await fs.mkdir(dirPath, { recursive: true });
  } catch (err) {
    if (err.code !== 'EEXIST') {
      console.error(`Failed to create directory ${dirPath}:`, err);
    }
  }
}

// Load config search paths
async function getSearchPaths() {
  try {
    if (existsSync(CONFIG_FILE)) {
      const data = await fs.readFile(CONFIG_FILE, 'utf-8');
      const config = JSON.parse(data);
      if (Array.isArray(config.searchPaths)) {
        // Resolve all paths to absolute paths
        return config.searchPaths.map(p => path.resolve(process.cwd(), p));
      }
    }
  } catch (err) {
    console.error('Error reading config.json:', err);
  }
  
  // Return default if config doesn't exist or is invalid
  await ensureDir(DEFAULT_DATA_DIR);
  return [DEFAULT_DATA_DIR];
}

// Save config search paths
async function saveSearchPaths(paths) {
  try {
    // Keep them as relative paths in config if they are within process.cwd() for portability
    const portablePaths = paths.map(p => {
      const resolved = path.resolve(process.cwd(), p);
      if (resolved.startsWith(process.cwd())) {
        const relative = path.relative(process.cwd(), resolved);
        return relative ? `./${relative.replace(/\\/g, '/')}` : '.';
      }
      return resolved;
    });

    await fs.writeFile(CONFIG_FILE, JSON.stringify({ searchPaths: portablePaths }, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving config.json:', err);
  }
}

// API: Get config
app.get('/api/config', async (req, res) => {
  try {
    const paths = await getSearchPaths();
    res.json({ searchPaths: paths });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

// API: Add search path
app.post('/api/config/paths', async (req, res) => {
  try {
    const { newPath } = req.body;
    if (!newPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const absolutePath = path.resolve(process.cwd(), newPath);
    await ensureDir(absolutePath);

    const paths = await getSearchPaths();
    if (!paths.includes(absolutePath)) {
      paths.push(absolutePath);
      await saveSearchPaths(paths);
    }

    res.json({ searchPaths: paths });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add search path' });
  }
});

// API: Remove search path
app.delete('/api/config/paths', async (req, res) => {
  try {
    const { targetPath } = req.body;
    if (!targetPath) {
      return res.status(400).json({ error: 'Path is required' });
    }

    const absolutePath = path.resolve(process.cwd(), targetPath);
    let paths = await getSearchPaths();
    
    paths = paths.filter(p => p !== absolutePath);
    await saveSearchPaths(paths);

    res.json({ searchPaths: paths });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove search path' });
  }
});

// API: Get all card sets from all search paths
app.get('/api/sets', async (req, res) => {
  try {
    const searchPaths = await getSearchPaths();
    const sets = [];

    for (const dir of searchPaths) {
      await ensureDir(dir);
      try {
        const files = await fs.readdir(dir);
        const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'config.json');

        for (const file of jsonFiles) {
          const filePath = path.join(dir, file);
          try {
            const content = await fs.readFile(filePath, 'utf-8');
            const data = JSON.parse(content);
            
            // Simple validation that it looks like a set
            if (data.name && Array.isArray(data.cards)) {
              sets.push({
                id: data.id || file.replace('.json', ''),
                name: data.name,
                cardCount: data.cards.length,
                filePath: filePath
              });
            }
          } catch (readErr) {
            console.error(`Error reading card set file ${filePath}:`, readErr);
          }
        }
      } catch (dirErr) {
        console.error(`Error scanning directory ${dir}:`, dirErr);
      }
    }

    res.json(sets);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve card sets' });
  }
});

// API: Get specific set by file path
app.get('/api/sets/by-path', async (req, res) => {
  try {
    const { filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath parameter is required' });
    }

    const absolutePath = path.resolve(filePath);
    if (!existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Card set file not found' });
    }

    const content = await fs.readFile(absolutePath, 'utf-8');
    res.json(JSON.parse(content));
  } catch (err) {
    res.status(500).json({ error: 'Failed to read card set file' });
  }
});

// API: Create new card set
app.post('/api/sets', async (req, res) => {
  try {
    const { name, cards, saveDirectory } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Set name is required' });
    }

    const searchPaths = await getSearchPaths();
    let targetDir = DEFAULT_DATA_DIR;

    if (saveDirectory) {
      targetDir = path.resolve(process.cwd(), saveDirectory);
      await ensureDir(targetDir);

      // Auto-add directory to search paths if not already there
      if (!searchPaths.includes(targetDir)) {
        searchPaths.push(targetDir);
        await saveSearchPaths(searchPaths);
      }
    } else {
      // Default to first search path or default folder
      targetDir = searchPaths[0] || DEFAULT_DATA_DIR;
      await ensureDir(targetDir);
    }

    const id = `set_${Date.now()}`;
    const fileName = `${id}.json`;
    const filePath = path.join(targetDir, fileName);

    const newSet = {
      id,
      name,
      cards: cards || []
    };

    await fs.writeFile(filePath, JSON.stringify(newSet, null, 2), 'utf-8');
    
    res.status(201).json({
      id,
      name,
      cardCount: newSet.cards.length,
      filePath
    });
  } catch (err) {
    console.error('Error creating set:', err);
    res.status(500).json({ error: 'Failed to create card set' });
  }
});

// API: Update card set
app.put('/api/sets', async (req, res) => {
  try {
    const { filePath, name, cards } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }
    if (!name) {
      return res.status(400).json({ error: 'Set name is required' });
    }

    const absolutePath = path.resolve(filePath);
    if (!existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Card set file not found' });
    }

    // Read existing to keep ID
    const content = await fs.readFile(absolutePath, 'utf-8');
    const existing = JSON.parse(content);

    const updatedSet = {
      id: existing.id || `set_${Date.now()}`,
      name,
      cards: cards || []
    };

    await fs.writeFile(absolutePath, JSON.stringify(updatedSet, null, 2), 'utf-8');

    res.json({
      id: updatedSet.id,
      name: updatedSet.name,
      cardCount: updatedSet.cards.length,
      filePath: absolutePath
    });
  } catch (err) {
    console.error('Error updating set:', err);
    res.status(500).json({ error: 'Failed to update card set' });
  }
});

// API: Delete card set
app.delete('/api/sets', async (req, res) => {
  try {
    const { filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath parameter is required' });
    }

    const absolutePath = path.resolve(filePath);
    if (!existsSync(absolutePath)) {
      return res.status(404).json({ error: 'Card set file not found' });
    }

    await fs.unlink(absolutePath);
    res.json({ message: 'Card set deleted successfully' });
  } catch (err) {
    console.error('Error deleting set:', err);
    res.status(500).json({ error: 'Failed to delete card set' });
  }
});

// Serve frontend in production (optional, if they build it)
const DIST_PATH = path.join(process.cwd(), 'dist');
if (existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.get(/.*/, (req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Backend server is running on http://localhost:${PORT}`);
});
