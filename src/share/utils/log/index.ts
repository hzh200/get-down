import { LogPath } from '../../../../configs/path'
import { isDev } from '../../../share/global'
import * as fs from 'fs'

// let fd: number
// const initLog = () => {
//     if (!fs.existsSync(LogPath)) {
//         fd = fs.openSync(LogPath, 'w')
//     } else {
//         fd = fs.openSync(LogPath, 'r+')
//     }
// }

class Log {
    private static log = (message: string) => {
        const localeDateTime: string = new Date().toLocaleString()
        const logMessage: string = localeDateTime + ' ' + message + '\n'
        if (isDev) {
            process.stdout.write(logMessage)
        } else {
            fs.appendFileSync(LogPath, logMessage)
        }
    }

    static infoLog = (message: string) => {
        Log.log('[Info] ' + message)
    }

    static errorLog = (error: Error | string) => {
        if (!error) {
            return
        }
        if (!(error instanceof Error)) {
            Log.log('[Error] ' + error)
            return
        }
        if (error.stack) {
            Log.log('[Error] ' + error.stack)
        } else if (error.message) {
            Log.log('[Error] ' + error.message)
        }      
    }

    static fatalLog = (error: Error) => {
        if (!error) {
            return
        }
        if (!(error instanceof Error)) {
            Log.log('[Fatal] ' + error)
            return
        }
        if (error.stack) {
            Log.log('[Fatal] ' + error.stack)
        } else if (error.message) {
            Log.log('[Fatal] ' + error.message)
        }  
    }
}

export { Log }