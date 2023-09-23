import * as path from 'node:path';
import { isDev } from './runtime_mode';

const SOFTWARE_NAME = 'http-downloader';
const EXE_NAME = path.basename(process.execPath); // electron.exe
const BASE_NAME = isDev ? 'dev' : 'app';

let PROJECT_PATH = __dirname;
while (PROJECT_PATH.includes(BASE_NAME)) {
    PROJECT_PATH = path.resolve(PROJECT_PATH, '..');
}

const BASE_PATH = path.resolve(PROJECT_PATH, BASE_NAME);
const APP_PATH = path.resolve(BASE_PATH, 'renderer', 'index.html');
const DB_PATH = path.join(BASE_PATH, 'database.sqlite');
const SETTING_PATH = path.join(BASE_PATH, 'setting.json');
const LOG_PATH = path.join(BASE_PATH, 'downloader.log');
const ICON_PATH = path.join(BASE_PATH, 'resources', 'favicon.ico');

export {
    BASE_PATH,
    APP_PATH,
    DB_PATH,
    SETTING_PATH,
    LOG_PATH,
    ICON_PATH,
    SOFTWARE_NAME,
    EXE_NAME
};