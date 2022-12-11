import { settingPath } from '../../../config/path'
import * as fs from 'node:fs'
import * as path from 'node:path'
import * as os from 'node:os'
import { AxiosProxyConfig } from 'axios'

const getDefaultSetting = (): {[key: string]: any} => {
    const proxy: AxiosProxyConfig = {
        protocol: 'http',
        host: '',
        port: -1,
    }
    let downloadPath: string
    if (process.env.NODE_ENV === 'development') {
        downloadPath = './downloads'
    } else { // process.env.NODE_ENV === 'production'
        downloadPath = path.join(process.env.HOME || process.env.USERPROFILE || os.homedir() as string, 'Downloads')
    }
    
    let setting: {[key: string]: any} = {
        proxy: proxy,
        location: downloadPath,
        trafficLimit: null
    }
    return setting
}

// Write new setting to the setting file.
// Throw error.
const writeSetting = (setting: {[key: string]: any}): void => {
    fs.writeFileSync(settingPath, JSON.stringify(setting))
}

// Read setting from the setting file, beacuse it's used by both main and renderer processes.
// Throw error
const readSetting = (): {[key: string]: any} => {
    let setting: {[key: string]: any}
    if (!fs.existsSync(settingPath)) {
        setting = getDefaultSetting()
        writeSetting(setting)
    } else {
        setting = JSON.parse(fs.readFileSync(settingPath, { encoding: 'utf-8' }))
    }
    return setting
}

export { readSetting, writeSetting }