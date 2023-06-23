import { app, BrowserWindow, ipcMain, IpcMainEvent, Event, screen, Menu } from 'electron'
import { initialize, enable } from '@electron/remote/main'
import * as path from 'node:path'
import { Scheduler } from './scheduler'
import { initPersistence } from './persistence'
import { Log } from '../share/utils'
import { DIST_PATH } from '../share/global/paths'
import { isDev } from '../share/global/runtime_mode'

initialize()
let mainWindow: BrowserWindow
let devtoolsWindow: BrowserWindow
let scheduler: Scheduler

const [MAIN_WIDTH, MAIN_HEIGHT, DEVTOOLS_WIDTH, DEVTOOLS_HEIGHT] = [1200, 800, 800, 800]

let screenHeight: number
let screenWidth: number
let scaleFactor: number


// Create main window in single page application.
const createMainWindow = (): Promise<void> => {
    return new Promise((resolve) => {
        mainWindow = new BrowserWindow({
            width: (MAIN_WIDTH > screenWidth ? screenWidth : MAIN_WIDTH) / scaleFactor,
            height: (MAIN_HEIGHT > screenHeight ? screenHeight : MAIN_HEIGHT) / scaleFactor,
            show: false,
            webPreferences: {
                zoomFactor: 1.0 / scaleFactor,
                nodeIntegration: true,
                contextIsolation: false
            }
        })
        enable(mainWindow.webContents)
        mainWindow.loadFile(path.resolve(DIST_PATH, 'app.html'))

        mainWindow.on('ready-to-show', () => {
            mainWindow.show()
            if (isDev) {
                createDevToolsWindow()
            }
            resolve()
        })
    })
} 

// Create the devtool window if the program runs in dev mode.
const createDevToolsWindow = (): void => {
    devtoolsWindow = new BrowserWindow({
        title: 'dev-tools',
        width: (MAIN_WIDTH + DEVTOOLS_WIDTH > screenWidth ? screenWidth - MAIN_WIDTH: DEVTOOLS_WIDTH) / scaleFactor,
        height: (MAIN_HEIGHT + DEVTOOLS_HEIGHT > screenHeight ? screenHeight - MAIN_HEIGHT : DEVTOOLS_HEIGHT) / scaleFactor,
        show: true,
        webPreferences: {
            zoomFactor: 1.0 / scaleFactor
        }
    })
    devtoolsWindow.setMenu(null);
    mainWindow.webContents.setDevToolsWebContents(devtoolsWindow.webContents)
    mainWindow.webContents.openDevTools({ mode: 'detach' })

    const resetDevTools = () => { // Put the DevTools window at the right side of the main window.
        if (devtoolsWindow.isDestroyed()) {
            return
        }
        const windowBounds = mainWindow.getBounds()
        devtoolsWindow.setPosition(windowBounds.x + windowBounds.width, windowBounds.y) 
        devtoolsWindow.setSize(DEVTOOLS_HEIGHT, DEVTOOLS_WIDTH)
    }

    const setPosition = () => {
        const x = (screenWidth - mainWindow.getSize()[0] - (!devtoolsWindow.isDestroyed() ? devtoolsWindow.getSize()[0] : 0)) / 2
        const y = (screenHeight - (!devtoolsWindow.isDestroyed() ? Math.max(mainWindow.getSize()[1], devtoolsWindow.getSize()[1]) : mainWindow.getSize()[1])) / 2
        mainWindow.setPosition(x, y)
    }

    setPosition()
    resetDevTools()
    devtoolsWindow.addListener('closed', setPosition)
    mainWindow.addListener('move', resetDevTools)
    mainWindow.addListener('close', (_event: Event) => {
        if (!devtoolsWindow.isDestroyed()) {
            devtoolsWindow.close()
        }
    })
}

process.on('uncaughtException', (error: Error, _origin: NodeJS.UncaughtExceptionOrigin) => {
    Log.errorLog(error)
})

const parserWindowLock = app.requestSingleInstanceLock() // Call for single instance.
if (!parserWindowLock) {
    app.quit()
}

app.on('window-all-closed', () => { // Windows & Linux
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

app.on('activate', () => { // Mac
    if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow()
    }
})

app.whenReady().then(
    // Initial database connection before everything else.
    () => initPersistence()
).then(   
    () => {
        ({height: screenHeight, width: screenWidth} = screen.getPrimaryDisplay().size)
        scaleFactor = screen.getPrimaryDisplay().scaleFactor
        createMainWindow() // Initial interface and renderer process before main process scheduler.
    }
).then(
    () => {
        // initLog()
        scheduler = new Scheduler()
        Log.infoLog('Application started.')
    }
).catch((error: any) => {
    Log.errorLog(error)
})

export { mainWindow }