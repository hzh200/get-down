import * as path from 'node:path'
import * as os from 'node:os'

const dirPath: string = path.resolve(__dirname, '..')
const srcPath: string = path.resolve(dirPath, 'src')
const bundlePath: string = path.resolve(dirPath, 'bundle')
const dbPath: string = path.join(bundlePath, 'database.sqlite')
const settingPath: string = path.join(bundlePath, 'setting.json')
const logPath: string = path.join(bundlePath, 'downloader.log')

export {
    dirPath,
    srcPath,
    bundlePath,
    dbPath,
    settingPath,
    logPath
}