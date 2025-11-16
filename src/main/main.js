import { app, BrowserWindow, ipcMain } from 'electron';

// Set application name for better Windows integration
app.setName('WayFinder Expedition Log');
import { join } from 'path';
import { fileURLToPath } from 'url';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

let mainWindow;

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
  
  try {
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        preload: join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false
      }
    });
  } catch (error) {
    console.error('Failed to create window:', error);
    app.quit();
    return;
  }

  // Set Content Security Policy
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          isDev
            ? "default-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:* data:; script-src 'self' 'unsafe-inline' 'unsafe-eval' http://localhost:*; style-src 'self' 'unsafe-inline' http://localhost:*;"
            : "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';"
        ]
      }
    });
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, dist is at the same level as dist-electron
    const htmlPath = join(__dirname, '../dist/index.html');
    console.log('Loading HTML from:', htmlPath);
    mainWindow.loadFile(htmlPath).catch(err => {
      console.error('Failed to load HTML file:', err);
      // Try alternative path
      const altPath = join(process.resourcesPath || __dirname, '../dist/index.html');
      console.log('Trying alternative path:', altPath);
      mainWindow.loadFile(altPath).catch(err2 => {
        console.error('Failed to load from alternative path:', err2);
      });
    });
  }

  // Add error handlers for debugging
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', validatedURL, 'Error:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('crashed', () => {
    console.error('Renderer process crashed');
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

const getFormsDirectory = () => {
  return join(app.getPath('userData'), 'forms');
};

const ensureFormsDirectory = async () => {
  const dir = getFormsDirectory();
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  return dir;
};

ipcMain.handle('save-form', async (event, formData) => {
  try {
    const dir = await ensureFormsDirectory();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `form-${timestamp}.json`;
    const filepath = join(dir, filename);
    await writeFile(filepath, JSON.stringify(formData, null, 2), 'utf-8');
    return { success: true, filename };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('load-forms', async () => {
  try {
    const dir = await ensureFormsDirectory();
    const { readdir } = await import('fs/promises');
    const files = await readdir(dir);
    const forms = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const filepath = join(dir, file);
        const content = await readFile(filepath, 'utf-8');
        const formData = JSON.parse(content);
        forms.push({ id: file, ...formData, filename: file });
      }
    }
    
    return { success: true, forms: forms.sort((a, b) => 
      new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
    )};
  } catch (error) {
    return { success: false, error: error.message, forms: [] };
  }
});

ipcMain.handle('load-form', async (event, filename) => {
  try {
    const dir = getFormsDirectory();
    const filepath = join(dir, filename);
    const content = await readFile(filepath, 'utf-8');
    const formData = JSON.parse(content);
    return { success: true, formData };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('delete-form', async (event, filename) => {
  try {
    const { unlink } = await import('fs/promises');
    const dir = getFormsDirectory();
    const filepath = join(dir, filename);
    await unlink(filepath);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle('get-field-config', async () => {
  try {
    // Try multiple possible paths for field-config.json
    const possiblePaths = [
      join(__dirname, '../field-config.json'), // Production (same level as dist-electron)
      join(__dirname, '../../field-config.json'), // Development
      join(process.resourcesPath || app.getAppPath(), 'field-config.json'), // Packaged app resources
      join(app.getAppPath(), 'field-config.json'), // App path
      join(process.cwd(), 'field-config.json'), // Current working directory
    ];
    
    console.log('Looking for field-config.json in paths:');
    let configPath = null;
    for (const path of possiblePaths) {
      console.log('  Checking:', path, existsSync(path) ? 'EXISTS' : 'not found');
      if (existsSync(path)) {
        configPath = path;
        break;
      }
    }
    
    if (configPath) {
      console.log('Found field-config.json at:', configPath);
      const content = await readFile(configPath, 'utf-8');
      return { success: true, config: JSON.parse(content) };
    }
    console.error('field-config.json not found in any of the checked paths');
    return { success: false, error: 'Field configuration file (field-config.json) not found. Please ensure it exists in the application directory.' };
  } catch (error) {
    console.error('Error loading field-config.json:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('print-form', async (event, htmlContent) => {
  try {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false
      }
    });
    
    await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
    
    printWindow.webContents.on('did-finish-load', () => {
      printWindow.webContents.print({
        silent: false,
        printBackground: true
      }, (success) => {
        if (success) {
          printWindow.close();
        }
      });
    });
    
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

