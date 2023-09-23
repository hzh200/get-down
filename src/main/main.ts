import { app, BrowserWindow, Event, screen, Menu, Tray } from 'electron';
import { initialize, enable } from '@electron/remote/main';
import Scheduler from './scheduler';
import { initPersistence } from './persistence';
import { Log } from '../share/utils';
import { APP_PATH, ICON_PATH, SOFTWARE_NAME, EXE_NAME } from '../share/global/paths';
import { globalSetting } from '../share/global/setting';
import { isDev } from '../share/global/runtime_mode';

initialize();
let mainWindow: BrowserWindow;
let devtoolsWindow: BrowserWindow;
let scheduler: Scheduler;
let tray: Tray;

let mainWindowCloseFlag: boolean = false;

const [MAIN_WIDTH, MAIN_HEIGHT, DEVTOOLS_WIDTH, DEVTOOLS_HEIGHT] = [1200, 800, 800, 800];
let screenHeight: number;
let screenWidth: number;
let scaleFactor: number;

const silentMode = app.commandLine.getSwitchValue("start-mode") === 'silent'; // On the contrary, normal.

// Initialize main window in single page application.
const initMainWindow = (): Promise<void> => {
    mainWindow = new BrowserWindow({
        width: (MAIN_WIDTH > screenWidth ? screenWidth : MAIN_WIDTH) / scaleFactor,
        height: (MAIN_HEIGHT > screenHeight ? screenHeight : MAIN_HEIGHT) / scaleFactor,
        icon: ICON_PATH,
        show: false,
        webPreferences: {
            zoomFactor: 1.0 / scaleFactor,
            nodeIntegration: true,
            contextIsolation: false
        }
    });
    enable(mainWindow.webContents);
    mainWindow.loadFile(APP_PATH);
    mainWindow.addListener('close', (event) => {
        if (mainWindowCloseFlag) return;
        event.preventDefault();
        if (globalSetting.closeToTray) {
            mainWindow.hide();
        } else {
            quit();
        } 
    });
    return new Promise((resolve) => {
        mainWindow.on('ready-to-show', () => {
            silentMode ? undefined : mainWindow.show();
            isDev ? initDevToolsWindow().then(resolve) : resolve();
        });
    });
};

// Initialize the devtool window if the program runs in dev mode.
const initDevToolsWindow = (): Promise<void> => {
    devtoolsWindow = new BrowserWindow({
        width: (MAIN_WIDTH + DEVTOOLS_WIDTH > screenWidth ? screenWidth - MAIN_WIDTH: DEVTOOLS_WIDTH) / scaleFactor,
        height: (MAIN_HEIGHT + DEVTOOLS_HEIGHT > screenHeight ? screenHeight - MAIN_HEIGHT : DEVTOOLS_HEIGHT) / scaleFactor,
        icon: ICON_PATH,
        show: false,
        webPreferences: {
            zoomFactor: 1.0 / scaleFactor
        }
    });
    devtoolsWindow.setMenu(null);
    mainWindow.webContents.setDevToolsWebContents(devtoolsWindow.webContents);
    mainWindow.webContents.openDevTools({ mode: 'detach' });

    const resetDevTools = () => { // Put the DevTools window at the right side of the main window.
        if (devtoolsWindow.isDestroyed()) return;
        const windowBounds = mainWindow.getBounds();
        devtoolsWindow.setPosition(windowBounds.x + windowBounds.width, windowBounds.y) ;
        devtoolsWindow.setSize(DEVTOOLS_HEIGHT, DEVTOOLS_WIDTH);
    }

    const setPosition = () => {
        const mainSize = mainWindow.isDestroyed() ? [0, 0] : mainWindow.getSize();
        const devtoolSize = devtoolsWindow.isDestroyed() ? [0, 0] : devtoolsWindow.getSize();
        const x = (screenWidth - mainSize[0] - devtoolSize[0]) / 2;
        const y = (screenHeight - Math.max(mainSize[1], devtoolSize[1])) / 2;
        mainWindow.setPosition(Math.floor(x), Math.floor(y));
    };

    setPosition();
    resetDevTools();
    devtoolsWindow.addListener('closed', setPosition);
    mainWindow.addListener('move', resetDevTools);
    mainWindow.addListener('close', (_event: Event) => {
        if (!devtoolsWindow.isDestroyed()) {
            devtoolsWindow.close();
        }
    });

    return new Promise((resolve) => {
        devtoolsWindow.on('ready-to-show', () => {
            silentMode ? undefined : devtoolsWindow.show();
            resolve();
        });
    });
};

const initTray = () => {
    tray = new Tray(ICON_PATH);
    const contextMenu = Menu.buildFromTemplate([
        { label: 'Main Window', click: () => mainWindow.show() },
        { label: 'Quit', click: quit },
    ]);
    tray.setToolTip(SOFTWARE_NAME);
    tray.setContextMenu(contextMenu);
    tray.on('double-click', () => mainWindow.show());
};

const quit = async () => {
    await scheduler.shutdown();
    mainWindowCloseFlag = true;
    mainWindow.close();
    app.quit();
};

// process.on('uncaughtException', (error: Error, _origin: NodeJS.UncaughtExceptionOrigin) => {
//     Log.error(error);
// });

if (!app.requestSingleInstanceLock()) { // Call for single instance.
    quit();
}

app.whenReady().then(
    // Initial database connection before everything else.
    () => initPersistence()
).then(   
    () => {
        initTray();
        ({height: screenHeight, width: screenWidth} = screen.getPrimaryDisplay().size);
        scaleFactor = screen.getPrimaryDisplay().scaleFactor;
        return initMainWindow(); // Initial interface and renderer process before main process scheduler.
    }
).then(
    () => {
        // initLog();
        scheduler = new Scheduler();
        setInterval(() => {
            if (globalSetting.launchOnStartup) {
                app.setLoginItemSettings({
                    openAtLogin: true,
                    path: process.execPath,
                    args: [
                      '--processStart', `"${EXE_NAME}"`,
                      '--process-start-args', '"--start-mode=silent"'
                    ]
                });
            } else {
                app.setLoginItemSettings({ openAtLogin: false });
            }
        }, 100);
        Log.info('Application started.');
    }
).catch((error: any) => {
    Log.fatal(error);
});

export { mainWindow };