import * as path from 'node:path'

let PROJECT_PATH = __dirname
while (PROJECT_PATH.includes('dist')) {
    PROJECT_PATH = path.resolve(PROJECT_PATH, '..')
}

// const SRC_PATH = path.resolve(PROJECT_PATH, 'src')
const DIST_PATH = path.resolve(PROJECT_PATH, 'dist')
const DB_PATH = path.join(DIST_PATH, 'database.sqlite')
const SETTING_PATH = path.join(DIST_PATH, 'setting.json')
const LOG_PATH = path.join(DIST_PATH, 'downloader.log')

export {
    DIST_PATH,
    DB_PATH,
    SETTING_PATH,
    LOG_PATH
}