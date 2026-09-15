const UPDATE_CHECK_DELAY_MS = 5_000;
const UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1_000;

function setupAutoUpdater({
  app,
  autoUpdater,
  dialog,
  getWindow,
  platform = process.platform,
  scheduleTimeout = setTimeout,
  scheduleInterval = setInterval,
}) {
  if (!app.isPackaged || platform !== 'win32') {
    return { enabled: false };
  }

  let promptOpen = false;
  let downloadInProgress = false;

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.allowPrerelease = false;

  autoUpdater.on('update-available', async (info) => {
    const window = getUsableWindow(getWindow);
    if (!window || promptOpen || downloadInProgress) return;

    promptOpen = true;
    try {
      const result = await dialog.showMessageBox(window, {
        type: 'info',
        title: 'Update available',
        message: `Version ${info.version} is available.`,
        detail: 'Download the update now? You can continue reading while it downloads.',
        buttons: ['Download', 'Later'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });

      if (result.response === 0) {
        downloadInProgress = true;
        await autoUpdater.downloadUpdate();
      }
    } catch (error) {
      downloadInProgress = false;
      console.error('Unable to download update:', error);
    } finally {
      promptOpen = false;
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    const window = getUsableWindow(getWindow);
    if (window) window.setProgressBar(Math.max(0, Math.min(1, progress.percent / 100)));
  });

  autoUpdater.on('update-downloaded', async (info) => {
    downloadInProgress = false;
    const window = getUsableWindow(getWindow);
    if (!window || promptOpen) return;

    window.setProgressBar(-1);
    promptOpen = true;
    try {
      const result = await dialog.showMessageBox(window, {
        type: 'info',
        title: 'Update ready',
        message: `Version ${info.version} is ready to install.`,
        detail: 'Restart the application to finish the update.',
        buttons: ['Restart and update', 'Later'],
        defaultId: 0,
        cancelId: 1,
        noLink: true,
      });

      if (result.response === 0) {
        autoUpdater.quitAndInstall(false, true);
      }
    } finally {
      promptOpen = false;
    }
  });

  autoUpdater.on('error', (error) => {
    downloadInProgress = false;
    const window = getUsableWindow(getWindow);
    if (window) window.setProgressBar(-1);
    console.error('Automatic update failed:', error);
  });

  const checkForUpdates = () => {
    autoUpdater.checkForUpdates().catch((error) => {
      console.error('Unable to check for updates:', error);
    });
  };

  const initialCheck = scheduleTimeout(checkForUpdates, UPDATE_CHECK_DELAY_MS);
  const periodicCheck = scheduleInterval(checkForUpdates, UPDATE_CHECK_INTERVAL_MS);
  initialCheck?.unref?.();
  periodicCheck?.unref?.();

  return { enabled: true, checkForUpdates };
}

function getUsableWindow(getWindow) {
  const window = getWindow();
  return window && !window.isDestroyed() ? window : null;
}

module.exports = {
  UPDATE_CHECK_DELAY_MS,
  UPDATE_CHECK_INTERVAL_MS,
  setupAutoUpdater,
};
