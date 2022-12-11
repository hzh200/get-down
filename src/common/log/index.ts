import { logPath } from '../../../config/path'
import * as path from 'path'
import * as fs from 'fs'

const localeDate: string = new Date().toLocaleDateString()
// let fd: number
// const initLog = () => {
//     if (!fs.existsSync(logPath)) {
//         fd = fs.openSync(logPath, 'w')
//     } else {
//         fd = fs.openSync(logPath, 'r+')
//     }
// }

class Log {
    private static log = (message: string) => {
        const localeDateTime = new Date().toLocaleString()
        fs.appendFileSync(logPath, localeDateTime + ' ' + message + '\n')
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