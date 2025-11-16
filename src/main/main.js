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
    // Resolve preload script path
    const preloadPath = isDev 
      ? join(__dirname, 'preload.js')
      : join(__dirname, 'preload.js'); // In packaged app, preload is in same dir as main
    
    console.log('Preload path:', preloadPath);
    
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false, // Don't show until ready
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: false,
        webSecurity: true
      }
    });

    // Show window when ready
    mainWindow.once('ready-to-show', () => {
      mainWindow.show();
      if (isDev) {
        mainWindow.webContents.openDevTools();
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
  } else {
    // In production, when packaged by electron-builder:
    // - Files are in resources/app/
    // - __dirname points to resources/app/dist-electron/
    // - dist/ is at resources/app/dist/
    const appPath = app.getAppPath();
    console.log('App path:', appPath);
    console.log('__dirname:', __dirname);
    
    // Try paths in order of likelihood
    const htmlPaths = [
      join(appPath, 'dist/index.html'), // Most reliable - uses app.getAppPath()
      join(__dirname, '../dist/index.html'), // Relative to dist-electron
      join(process.resourcesPath || appPath, 'app/dist/index.html'), // Alternative
    ];

    let loaded = false;
    for (const htmlPath of htmlPaths) {
      console.log('Checking path:', htmlPath, existsSync(htmlPath) ? 'EXISTS' : 'not found');
      if (existsSync(htmlPath)) {
        console.log('Loading HTML from:', htmlPath);
        mainWindow.loadFile(htmlPath).then(() => {
          console.log('Successfully loaded HTML');
          loaded = true;
        }).catch(err => {
          console.error('Failed to load HTML file from', htmlPath, ':', err);
        });
        break;
      }
    }

    if (!loaded) {
      console.error('Could not find index.html in any expected location');
      // Show error to user
      mainWindow.webContents.once('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(`
          document.body.innerHTML = '<div style="padding: 20px; font-family: sans-serif;">
            <h1>Error Loading Application</h1>
            <p>Could not find index.html file.</p>
            <p>App Path: ${appPath}</p>
            <p>__dirname: ${__dirname}</p>
          </div>';
        `);
      });
    }
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

