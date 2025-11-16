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
    mainWindow.loadFile(join(__dirname, '../../dist/index.html'));
  }
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
    // Try multiple possible paths
    const possiblePaths = [
      join(__dirname, '../../field-config.json'), // Development
      join(process.cwd(), 'field-config.json'), // Current working directory
      join(app.getAppPath(), 'field-config.json'), // App path
    ];
    
    let configPath = null;
    for (const path of possiblePaths) {
      if (existsSync(path)) {
        configPath = path;
        break;
      }
    }
    
    if (configPath) {
      const content = await readFile(configPath, 'utf-8');
      return { success: true, config: JSON.parse(content) };
    }
    return { success: false, error: 'Field configuration file (field-config.json) not found. Please ensure it exists in the application directory.' };
  } catch (error) {
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

