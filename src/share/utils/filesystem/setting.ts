import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { SETTING_PATH } from '../../global/paths';

type trafficLimitConfig = {
    limitationEnablement: boolean;
    limitedSpeed: number;
};

enum ProxyChooses {
    NoProxy = 0,
    UseSystemProxy = 1,
    SetManually = 2
};

type ProxyConfig = {
    proxyChoosen: ProxyChooses;
    protocol: string;
    host: string | null;
    port: number | null;
};

type Setting = {
    location: string;
    trafficLimit: trafficLimitConfig
    proxy: ProxyConfig;
    launchOnStartup: boolean,
    closeToTray: boolean;
};

const getDefaultSetting = (): Setting => {
    const trafficLimit: trafficLimitConfig = {
        limitationEnablement: false,
        limitedSpeed: 0
    };
    const proxy: ProxyConfig = {
        proxyChoosen: ProxyChooses.UseSystemProxy,
        protocol: 'http',
        host: null,
        port: null
    };
    let downloadPath: string = path.join(process.env.HOME || process.env.USERPROFILE || os.homedir() as string, 'Downloads');
    return {
        location: downloadPath,
        trafficLimit: trafficLimit,
        proxy: proxy,
        launchOnStartup: true,
        closeToTray: true
    };
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