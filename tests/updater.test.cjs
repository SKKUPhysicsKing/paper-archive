const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const {
  UPDATE_CHECK_DELAY_MS,
  UPDATE_CHECK_INTERVAL_MS,
  setupAutoUpdater,
} = require('../electron/updater.cjs');

function createFixture({ packaged = true, platform = 'win32', dialogResponse = 1 } = {}) {
  const autoUpdater = new EventEmitter();
  autoUpdater.checkForUpdates = async () => {};
  autoUpdater.downloadUpdate = async () => {};
  autoUpdater.quitAndInstall = () => {};
  const window = {
    isDestroyed: () => false,
    setProgressBar: () => {},
  };
  const scheduled = {};

  const controller = setupAutoUpdater({
    app: { isPackaged: packaged },
    autoUpdater,
    dialog: { showMessageBox: async () => ({ response: dialogResponse }) },
    getWindow: () => window,
    platform,
    scheduleTimeout: (callback, delay) => {
      scheduled.timeout = { callback, delay };
      return { unref() {} };
    },
    scheduleInterval: (callback, delay) => {
      scheduled.interval = { callback, delay };
      return { unref() {} };
    },
  });

  return { autoUpdater, controller, scheduled, window };
}

test('automatic updates are disabled in development', () => {
  const fixture = createFixture({ packaged: false });
  assert.equal(fixture.controller.enabled, false);
  assert.equal(fixture.scheduled.timeout, undefined);
});

test('automatic updates are scheduled for installed Windows builds', () => {
  const fixture = createFixture();
  assert.equal(fixture.controller.enabled, true);
  assert.equal(fixture.autoUpdater.autoDownload, false);
  assert.equal(fixture.autoUpdater.autoInstallOnAppQuit, true);
  assert.equal(fixture.scheduled.timeout.delay, UPDATE_CHECK_DELAY_MS);
  assert.equal(fixture.scheduled.interval.delay, UPDATE_CHECK_INTERVAL_MS);
});

test('accepting an available update starts the download', async () => {
  const fixture = createFixture({ dialogResponse: 0 });
  let downloads = 0;
  fixture.autoUpdater.downloadUpdate = async () => {
    downloads += 1;
  };

  await fixture.autoUpdater.listeners('update-available')[0]({ version: '0.2.1' });
  assert.equal(downloads, 1);
});

test('declining an available update does not start the download', async () => {
  const fixture = createFixture({ dialogResponse: 1 });
  let downloads = 0;
  fixture.autoUpdater.downloadUpdate = async () => {
    downloads += 1;
  };

  await fixture.autoUpdater.listeners('update-available')[0]({ version: '0.2.1' });
  assert.equal(downloads, 0);
});
