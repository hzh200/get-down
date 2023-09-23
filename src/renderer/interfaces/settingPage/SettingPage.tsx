import * as React from 'react';
import { ProxyChooses, Setting } from '../../../share/utils';
import { globalSetting } from '../../../share/global/setting';
import './setting_page.css';

function SettingPage() {
    const [setting, setSetting] = React.useState<Setting>({ ...globalSetting });

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const target: HTMLInputElement = (event.target as HTMLInputElement);
        let name: string = target.name;
        let secondaryName: string = '';
        if (target.name.includes('-')) {
            [name, secondaryName] = target.name.split('-');
        }
        const value: any = target.type === 'checkbox' ? target.checked : target.value;
        if (name === 'location') {
            globalSetting.location = value;
        } else if (name === 'trafficLimit') {
            if (secondaryName === 'limitationEnablement') {
                globalSetting.trafficLimit.limitationEnablement = value;
            } else if (secondaryName === 'limitedSpeed') {
                globalSetting.trafficLimit.limitedSpeed = parseInt(value);
            }
        } else if (name === 'proxy') {
            if (secondaryName === 'proxyChoosen') {
                globalSetting.proxy.proxyChoosen = parseInt(value);
            } else if (secondaryName === 'host') {
                globalSetting.proxy.host = value;
            } else if (secondaryName === 'port') {
                globalSetting.proxy.port = value;
            }
        } else if (name === 'launchOnStartup') {
            globalSetting.launchOnStartup = value;
        } else if (name === 'closeToTray') {
            globalSetting.closeToTray = value;
        }
        setSetting({ ...globalSetting });
    };

    return (
        <React.Fragment>
            <SettingItem title='Task'>
                <SettingItemRow>
                    <p>location: </p>
                    <input type='text' size={30} value={setting['location']} name='location' onChange={handleChange} />
                </SettingItemRow>
                <SettingItemRow>
                    <p>Traffic Limit: </p>
                    <input type='checkbox' checked={setting.trafficLimit.limitationEnablement} name='trafficLimit-limitationEnablement' onChange={handleChange} />
                    <input type='text' size={8} value={setting.trafficLimit.limitationEnablement ? setting.trafficLimit.limitedSpeed : ''} name='trafficLimit-limitedSpeed' onChange={handleChange} disabled={!setting.trafficLimit.limitationEnablement} />
                    <label>Mb/s</label>
                </SettingItemRow>
            </SettingItem>
            <SettingItem title='Connection'>
                <SettingItemRow>
                    {/* <label>
                        <input type="radio" name="proxy-proxyChoosen" value={ProxyChooses.NoProxy} onChange={handleChange} checked={setting.proxy.proxyChoosen===ProxyChooses.NoProxy} />
                        No proxy.
                    </label> */}
                    {/*
                        Just like 'class', 'for' is a keyword in javascript so in JSX you can't use it directly. 
                        You must use htmlFor which is translated into for attribute once it is rendered to the DOM.
                    */}
                    <input type="radio" id='NoProxy' name="proxy-proxyChoosen" value={ProxyChooses.NoProxy} onChange={handleChange} checked={setting.proxy.proxyChoosen === ProxyChooses.NoProxy} />
                    <label htmlFor='NoProxy'>No proxy.</label>
                </SettingItemRow>
                <SettingItemRow>
                    <input type="radio" id='UseSystemProxy' name="proxy-proxyChoosen" value={ProxyChooses.UseSystemProxy} onChange={handleChange} checked={setting.proxy.proxyChoosen === ProxyChooses.UseSystemProxy} />
                    <label htmlFor='UseSystemProxy'>Use system proxy.</label>
                </SettingItemRow>
                <SettingItemRow>
                    <input type="radio" id='SetManually' name="proxy-proxyChoosen" value={ProxyChooses.SetManually} onChange={handleChange} checked={setting.proxy.proxyChoosen === ProxyChooses.SetManually} />
                    <label htmlFor='SetManually'>Set Manually.</label>
                </SettingItemRow>
                <SettingItemRow>
                    <p> Host: </p>
                    <input type='text' size={20} value={setting.proxy.host ? setting.proxy.host : ''} name='proxy-host' onChange={handleChange} disabled={setting.proxy.proxyChoosen !== ProxyChooses.SetManually} />
                    <p> Port: </p>
                    <input type='text' size={10} value={setting.proxy.port ? setting.proxy.port : ''} name='proxy-port' onChange={handleChange} disabled={setting.proxy.proxyChoosen !== ProxyChooses.SetManually} />
                </SettingItemRow>
            </SettingItem>
            <SettingItem title='System'>
                <SettingItemRow>
                    <p>Launch on Startup: </p>
                    <input type='checkbox' checked={setting.launchOnStartup} name='launchOnStartup' onChange={handleChange} />
                </SettingItemRow>
                <SettingItemRow>
                    <p>Close to Tray: </p>
                    <input type='checkbox' checked={setting.closeToTray} name='closeToTray' onChange={handleChange} />
                </SettingItemRow>
            </SettingItem>
        </React.Fragment>
    );
}

function SettingItem({ children, title }: { children: React.ReactElement | Array<React.ReactElement>, title: string }) {
    return (
        <div className='setting-item'>
            <div className='setting-item-title'><strong>{title}</strong></div>
            {children}
        </div>
    );
}

function SettingItemRow({ children }: { children: React.ReactElement | Array<React.ReactElement> }) {
    return (
        <div className='setting-item-row'>
            {children}
        </div>
    );
}

export default SettingPage;