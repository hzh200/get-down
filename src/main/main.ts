import { app, BrowserWindow, ipcMain, IpcMainEvent } from 'electron'
import * as path from 'node:path'
import { Scheduler } from './scheduler'
import { initPersistence } from './persistence'
import { readSetting, writeSetting } from '../common/setting'
import { Log } from '../common/log'
import { srcPath } from '../../config/path'

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
        mainWindow.loadFile(path.resolve(srcPath, 'app.html'))
        mainWindow.on('ready-to-show', () => {
            mainWindow.show()
            resolve()
        })
    })
} 

// Call single instance.
const parserWindowLock = app.requestSingleInstanceLock()
if (!parserWindowLock) {
    app.quit()
}

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