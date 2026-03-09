/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import fs from 'fs';
import { app, BrowserWindow, shell, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';
import { coursesService } from './services/courses';
import { cliService } from './services/cli';

app.setName('TopicCraft');

class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (process.platform === 'darwin') {
    if (mainWindow?.isFullScreen()) {
      mainWindow.setFullScreen(false);
    } else {
      mainWindow?.setFullScreen(true);
    }
  } else if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.on('window-open-dev-tools', () => {
  mainWindow?.webContents.openDevTools({ mode: 'detach' });
});

ipcMain.handle(
  'window-save-pdf',
  async (event, title?: string, base64Data?: string) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window) return false;

    const { filePath } = await dialog.showSaveDialog(window, {
      title: 'Save as PDF',
      defaultPath: title
        ? `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`
        : 'document.pdf',
      filters: [{ name: 'PDF', extensions: ['pdf'] }],
    });

    if (filePath) {
      try {
        if (base64Data) {
          fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        } else {
          const pdf = await window.webContents.printToPDF({
            printBackground: true,
            pageSize: 'A4',
          });
          fs.writeFileSync(filePath, pdf);
        }
        return true;
      } catch (error) {
        console.error('Failed to save PDF:', error);
        return false;
      }
    }
    return false;
  },
);

ipcMain.handle('courses:getCourses', () => coursesService.getCourses());
ipcMain.handle('courses:getCourse', (_event, id) =>
  coursesService.getCourse(id),
);
ipcMain.handle('courses:createCourse', (_event, title) =>
  coursesService.createCourse(title),
);
ipcMain.handle('courses:deleteCourse', (_event, id) =>
  coursesService.deleteCourse(id),
);
ipcMain.handle(
  'courses:regenerateSubSubjectContent',
  (_event, courseId, mainIdx, subIdx) =>
    coursesService.regenerateSubSubjectContent(courseId, mainIdx, subIdx),
);
ipcMain.handle(
  'courses:addComment',
  (_event, courseId, mainIdx, subIdx, text) =>
    coursesService.addComment(courseId, mainIdx, subIdx, text),
);
ipcMain.handle('courses:addMainSubject', (_event, courseId, title) =>
  coursesService.addMainSubject(courseId, title),
);
ipcMain.handle('courses:addSubSubject', (_event, courseId, mainIdx, title) =>
  coursesService.addSubSubject(courseId, mainIdx, title),
);

ipcMain.handle('cli:checkNode', () => cliService.checkNodeInstallation());
ipcMain.handle('cli:checkInstallation', () => cliService.checkInstallation());
ipcMain.handle('cli:checkAuth', () => cliService.checkAuth());

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  // require('electron-debug').default();
}

const installExtensions = async () => {
  // Disabled developer tools extensions
  return Promise.resolve();
};

const createWindow = async () => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  mainWindow = new BrowserWindow({
    show: false,
    width: 1024,
    height: 728,
    icon: getAssetPath('icon.png'),
    frame: false,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  mainWindow.loadURL(resolveHtmlPath('index.html'));

  mainWindow.on('ready-to-show', () => {
    if (!mainWindow) {
      throw new Error('"mainWindow" is not defined');
    }
    if (process.env.START_MINIMIZED) {
      mainWindow.minimize();
    } else {
      mainWindow.show();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const menuBuilder = new MenuBuilder(mainWindow);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  mainWindow.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();
};

/**
 * Add event listeners...
 */

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(() => {
    createWindow();
    app.on('activate', () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null) createWindow();
    });
  })
  .catch(console.log);
