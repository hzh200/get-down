import { LOG_PATH } from '../../global/paths'
import { isDev } from '../../global/runtime_mode'
import * as fs from 'fs'

// let fd: number
// const initLog = () => {
//     if (!fs.existsSync(LOG_PATH)) {
//         fd = fs.openSync(LOG_PATH, 'w')
//     } else {
//         fd = fs.openSync(LOG_PATH, 'r+')
//     }
// }

class Log {
    private static log = (message: string) => {
        const localeDateTime: string = new Date().toLocaleString()
        const logMessage: string = localeDateTime + ' ' + message + '\n'
        if (isDev) {
            process.stdout.write(logMessage)
        } else {
            fs.appendFileSync(LOG_PATH, logMessage)
        }
    }

    static infoLog = (message: string) => {
        Log.log('[Info] ' + message)
    }

    static errorLog = (error: Error | string) => {
        if (!(error instanceof Error)) {
            Log.log('[Error] ' + error)
            return
        }
        let message = '[Error]'
        if (error.message) {
            message += error.message
        }  
        if (error.stack) {
            message += ' ' + error.stack
        }  
        Log.log(message)  
    }

    static fatalLog = (error: Error) => {
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