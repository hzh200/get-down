import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SETTING_PATH } from '../../global/paths';

enum ProxyChooses {
    NoProxy = 0,
    UseSystemProxy = 1,
    SetManually = 2
}

type ProxyConfig = {
    proxyChoosen: ProxyChooses;
    protocol: string;
    host: string | null;
    port: number | null;
};

type Setting = {
    proxy: ProxyConfig;
    location: string;
    trafficLimit: number | null;
};

const getDefaultSetting = (): Setting => {
    const proxy: ProxyConfig = {
        proxyChoosen: ProxyChooses.UseSystemProxy,
        protocol: 'http',
        host: null,
        port: null,
    };

    let downloadPath: string = path.join(process.env.HOME || process.env.USERPROFILE || os.homedir() as string, 'Downloads');

    // if (process.env.NODE_ENV === 'development') {
    //     downloadPath = './downloads'
    // } else { // process.env.NODE_ENV === 'production'
    //     downloadPath = path.join(process.env.HOME || process.env.USERPROFILE || os.homedir() as string, 'Downloads')
    // }

    let setting: Setting = {
        proxy: proxy,
        location: downloadPath,
        trafficLimit: null
    };
    return setting;
};

// Write new setting to the setting file.
const writeSetting = (setting: Setting): void => {
    fs.writeFileSync(SETTING_PATH, JSON.stringify(setting, null, '\t'));
};

// Read setting from the setting file, beacuse it's used by both main and renderer processes.
const readSetting = (): Setting => {
    let setting: Setting;
    if (!fs.existsSync(SETTING_PATH)) {
        setting = getDefaultSetting();
        writeSetting(setting);
    } else {
        setting = JSON.parse(fs.readFileSync(SETTING_PATH, { encoding: 'utf-8' }));
    }
    return setting;
};

export { ProxyChooses, Setting, ProxyConfig, readSetting, writeSetting };