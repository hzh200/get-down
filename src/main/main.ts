import { app, BrowserWindow, ipcMain, IpcMainEvent } from 'electron'
import { initialize, enable } from '@electron/remote/main'
import * as path from 'node:path'
import { Scheduler } from './scheduler'
import { initPersistence } from './persistence'
import { Log } from '../common/log'
import { srcPath } from '../../config/path'
import { isDev } from '../common/global'

initialize()
let mainWindow: BrowserWindow
let scheduler: Scheduler

// Create main window in single page application.
const createMainWindow = (): Promise<void> => {
    return new Promise((resolve) => {
        mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            show: false,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false
            }
        })
        enable(mainWindow.webContents)
        mainWindow.loadFile(path.resolve(srcPath, 'app.html'))
        mainWindow.on('ready-to-show', () => {
            mainWindow.show()
            if (isDev) {
                mainWindow.webContents.openDevTools({ mode: 'detach' });
            }
            resolve()
        })
    })
} 

process.on('uncaughtException', (error: Error) => {
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
    // Initial interface and renderer process before main process scheduler.
    () => createMainWindow() 
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