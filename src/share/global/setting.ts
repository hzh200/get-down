import { writeSetting, readSetting, Setting } from "../utils";
import { Log } from "../utils";

const settingProxyHandler: ProxyHandler<any> = {
    set(target: any, prop: string | symbol, newValue: any, _receiver: any): boolean {
        try {
            target[prop] = newValue;
            const newSetting: Setting = readSetting();
            for (let p in newSetting) {
                (newSetting as any)[p] = (globalSetting as any)[p];
            }
            writeSetting(newSetting);
        } catch (error: any) {
            Log.error(error);
            return false;
        }
        return true;
    }
};

const setSettingProxyHandler = (setting: Setting): Setting => {
    setSettingProxyHandlerCore(setting);
    setting = new Proxy(setting, settingProxyHandler);
    return setting;
};

// arguments are pass by value
const setSettingProxyHandlerCore = (obj: { [key: string]: any }): void => {
    for (let prop in obj) {
        if (typeof obj[prop] === 'object' && obj[prop]) {
            setSettingProxyHandlerCore(obj[prop]);
            obj[prop] = new Proxy(obj[prop], settingProxyHandler);
        }
    }
};

let globalSetting: Setting = setSettingProxyHandler(readSetting());

setInterval(() => {
    try {
        globalSetting = setSettingProxyHandler(readSetting());
    } catch (error: any) {
        Log.error(error);
    }
}, 1000);

export { globalSetting };
