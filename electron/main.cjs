const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createLibraryService } = require('./library.cjs');
const { setupAutoUpdater } = require('./updater.cjs');

let mainWindow;
let settings = { libraryRoot: null, pairOverridesByRoot: {} };

function rendererEntryUrl() {
  return process.env.PAPER_ARCHIVE_DEV_SERVER_URL ??
    pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href;
}

function isTrustedRendererUrl(targetUrl) {
  try {
    const target = new URL(targetUrl);
    const allowed = new URL(rendererEntryUrl());
    if (allowed.protocol === 'file:') {
      return target.protocol === 'file:' && target.pathname === allowed.pathname;
    }
    return target.origin === allowed.origin;
  } catch {
    return false;
  }
}

function registerTrustedHandler(channel, handler) {
  ipcMain.handle(channel, (event, ...args) => {
    const trustedWindow = mainWindow && !mainWindow.isDestroyed() ? mainWindow : null;
    const trustedSender =
      trustedWindow &&
      event.sender === trustedWindow.webContents &&
      event.senderFrame === trustedWindow.webContents.mainFrame &&
      isTrustedRendererUrl(event.senderFrame.url);

    if (!trustedSender) throw new Error('Untrusted renderer request was blocked.');
    return handler(...args);
  });
}

function validateRelativePath(value, { allowEmpty = false } = {}) {
  if (typeof value !== 'string' || value.length > 32_768 || (!allowEmpty && !value)) {
    throw new TypeError('Invalid library path.');
  }
  return value;
}

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

  registerTrustedHandler('library:get', async () => {
    if (!settings.libraryRoot) return null;
    try {
      const stat = await fs.stat(settings.libraryRoot);
      return stat.isDirectory() ? libraryInfo() : null;
    } catch {
      return null;
    }
  });

  registerTrustedHandler('library:select', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose paper library folder',
      properties: ['openDirectory'],
      buttonLabel: 'Open folder',
    });
    if (result.canceled || !result.filePaths[0]) return null;

    settings.libraryRoot = path.resolve(result.filePaths[0]);
    await saveSettings();
    return libraryInfo();
  });

  registerTrustedHandler('library:list', (relativePath = '') =>
    library.listDirectory(validateRelativePath(relativePath, { allowEmpty: true })),
  );

  registerTrustedHandler('library:read-pdf', async (relativePath) => {
    const buffer = await library.readPdf(validateRelativePath(relativePath));
    return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  });

  registerTrustedHandler('viewer:set-fullscreen', (active) => {
    if (typeof active !== 'boolean') throw new TypeError('Invalid fullscreen value.');
    if (!mainWindow || mainWindow.isDestroyed()) return false;
    mainWindow.setFullScreen(Boolean(active));
    return mainWindow.isFullScreen();
  });

  registerTrustedHandler('library:choose-explanation', async (originalRelativePath) => {
    validateRelativePath(originalRelativePath);
    const originalAbsolutePath = library.resolveInsideRoot(originalRelativePath);
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Choose commentary PDF',
      defaultPath: path.dirname(originalAbsolutePath),
      properties: ['openFile'],
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
      buttonLabel: 'Open as commentary',
    });
    if (result.canceled || !result.filePaths[0]) return null;

    let selectedRelativePath;
    try {
      selectedRelativePath = library.relativeFromAbsolute(result.filePaths[0]);
    } catch {
      await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Paper Archive',
        message: 'The commentary PDF must be inside the selected paper library.',
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
      webSecurity: true,
      allowRunningInsecureContent: false,
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
  mainWindow.webContents.on('will-attach-webview', (event) => event.preventDefault());
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (!isTrustedRendererUrl(targetUrl)) event.preventDefault();
  });

  const rendererSession = mainWindow.webContents.session;
  rendererSession.setPermissionCheckHandler(() => false);
  rendererSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
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
  setupAutoUpdater({
    app,
    autoUpdater,
    dialog,
    getWindow: () => mainWindow,
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
