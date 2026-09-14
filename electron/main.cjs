const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
const { createLibraryService } = require('./library.cjs');

let mainWindow;
let settings = { libraryRoot: null, pairOverridesByRoot: {} };

function settingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

async function loadSettings() {
  try {
    const contents = await fs.readFile(settingsPath(), 'utf8');
    const parsed = JSON.parse(contents);
    settings = {
      libraryRoot: typeof parsed.libraryRoot === 'string' ? parsed.libraryRoot : null,
      pairOverridesByRoot:
        parsed.pairOverridesByRoot && typeof parsed.pairOverridesByRoot === 'object'
          ? parsed.pairOverridesByRoot
          : {},
    };

    if (
      settings.libraryRoot &&
      parsed.pairOverrides &&
      typeof parsed.pairOverrides === 'object' &&
      !settings.pairOverridesByRoot[settings.libraryRoot]
    ) {
      settings.pairOverridesByRoot[settings.libraryRoot] = parsed.pairOverrides;
    }
  } catch {
    settings = { libraryRoot: null, pairOverridesByRoot: {} };
  }

  const commandLineRoot = getCommandLineValue('library');
  if (commandLineRoot) settings.libraryRoot = path.resolve(commandLineRoot);
}

async function saveSettings() {
  await fs.mkdir(path.dirname(settingsPath()), { recursive: true });
  await fs.writeFile(settingsPath(), JSON.stringify(settings, null, 2), 'utf8');
}

function getCommandLineValue(name) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));
  return argument ? argument.slice(prefix.length) : undefined;
}

function libraryInfo() {
  if (!settings.libraryRoot) return null;
  return {
    name: path.basename(settings.libraryRoot),
    path: settings.libraryRoot,
  };
}

function registerIpcHandlers() {
  const library = createLibraryService({
    getRoot: () => settings.libraryRoot,
    getPairOverrides: () =>
      settings.libraryRoot ? settings.pairOverridesByRoot[settings.libraryRoot] ?? {} : {},
  });

  ipcMain.handle('library:get', async () => {
    if (!settings.libraryRoot) return null;
    try {
      const stat = await fs.stat(settings.libraryRoot);
      return stat.isDirectory() ? libraryInfo() : null;
    } catch {
      return null;
    }
  });

  ipcMain.handle('library:select', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '논문 라이브러리 폴더 선택',
      properties: ['openDirectory'],
      buttonLabel: '이 폴더 열기',
    });
    if (result.canceled || !result.filePaths[0]) return null;

    settings.libraryRoot = path.resolve(result.filePaths[0]);
    await saveSettings();
    return libraryInfo();
  });

  ipcMain.handle('library:list', (_event, relativePath = '') =>
    library.listDirectory(relativePath),
  );

  ipcMain.handle('library:read-pdf', async (_event, relativePath) => {
    const buffer = await library.readPdf(relativePath);
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  });

  ipcMain.handle('viewer:set-fullscreen', (_event, active) => {
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    mainWindow.setFullScreen(Boolean(active));
    return mainWindow.isFullScreen();
  });

  ipcMain.handle('library:choose-explanation', async (_event, originalRelativePath) => {
    const originalAbsolutePath = library.resolveInsideRoot(originalRelativePath);
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '해설 PDF 선택',
      defaultPath: path.dirname(originalAbsolutePath),
      properties: ['openFile'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      buttonLabel: '해설로 열기',
    });
    if (result.canceled || !result.filePaths[0]) return null;

    let selectedRelativePath;
    try {
      selectedRelativePath = library.relativeFromAbsolute(result.filePaths[0]);
    } catch {
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Paper Archive',
        message: '해설 PDF는 선택한 논문 라이브러리 폴더 안에 있어야 합니다.',
      });
      return null;
    }

    const portableOriginalPath = originalRelativePath.replace(/\\/g, '/');
    settings.pairOverridesByRoot[settings.libraryRoot] = {
      ...(settings.pairOverridesByRoot[settings.libraryRoot] ?? {}),
      [portableOriginalPath]: selectedRelativePath,
    };
    await saveSettings();
    return selectedRelativePath;
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 940,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#ffffff',
    show: false,
    autoHideMenuBar: true,
    title: 'Paper Archive',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const devServerUrl = process.env.PAPER_ARCHIVE_DEV_SERVER_URL;
  if (devServerUrl) {
    mainWindow.loadURL(devServerUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    const allowedUrl = devServerUrl ?? `file://${path.join(__dirname, '..', 'dist', 'index.html')}`;
    if (!targetUrl.startsWith(allowedUrl)) event.preventDefault();
  });

  const capturePath = process.env.PAPER_ARCHIVE_CAPTURE_PATH;
  if (capturePath) {
    mainWindow.webContents.once('did-finish-load', () => {
      setTimeout(async () => {
        const image = await mainWindow.webContents.capturePage();
        await fs.writeFile(capturePath, image.toPNG());
        app.quit();
      }, 2500);
    });
  }
}

app.whenReady().then(async () => {
  await loadSettings();
  registerIpcHandlers();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
